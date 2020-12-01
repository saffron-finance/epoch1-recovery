// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./interfaces/ISaffronPool.sol";
import "./lib/SafeMath.sol";
import "./lib/IERC20.sol";
import "./lib/ERC20.sol";
import "./lib/SafeERC20.sol";
import "./SFI.sol";
import "./SaffronLPBalanceToken.sol";

contract SaffronUniswapLPPool is ISaffronPool {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  address public governance;           // Governance (v3: add off-chain/on-chain governance)
  address public base_asset_address;   // Base asset managed by the pool (DAI, USDT, YFI...)
  address public SFI_address;          // SFI token
  uint256 public pool_principal;       // Current principal balance (added minus removed)

  bool public _shutdown = false;       // v0, v1: shutdown the pool after the final capital deploy to prevent burning funds

  /**** STRATEGY ****/
  address public strategy;

  /**** EPOCHS ****/
  epoch_params public epoch_cycle = epoch_params({
    start_date: 1604239200,   // 11/01/2020 @ 2:00pm (UTC)
    duration:   14 days       // 1210000 seconds
  });

  mapping(uint256=>bool) public epoch_wound_down; // True if epoch has been wound down already (governance)

  /**** EPOCH INDEXED STORAGE ****/
  uint256[] public epoch_principal;           // Total principal owned by the pool (all tranches)
  uint256[] public total_dsec;                // Total dsec (tokens + vdsec)
  uint256[] public SFI_earned;                // Total SFI earned (minted at wind_down_epoch)
  address[] public dsec_token_addresses;      // Address for each dsec token
  address[] public principal_token_addresses; // Address for each principal token

  /**** SAFFRON LP TOKENS ****/
  // If we just have a token address then we can look up epoch and tranche balance tokens using a mapping(address=>SaffronV1dsecInfo)
  // LP tokens are dsec (redeemable for interest+SFI) and principal (redeemable for base asset) tokens
  struct SaffronAMMLPTokenInfo {
    bool        exists;
    uint256     epoch;
    LPTokenType token_type;
  }

  mapping(address=>SaffronAMMLPTokenInfo) private saffron_LP_token_info;

  constructor(address _strategy, address _base_asset, address _SFI_address, bool epoch_cycle_reset) {
    governance = msg.sender;
    base_asset_address = _base_asset;
    SFI_address = _SFI_address;
    strategy = _strategy;
    epoch_cycle.start_date = (epoch_cycle_reset ? block.timestamp - get_current_epoch() * 14 days : 1604239200); // Make testing previous epochs easier
  }

  function new_epoch(uint256 epoch, address saffron_LP_dsec_token_address, address saffron_LP_principal_token_address) public {
    require(epoch_principal.length == epoch, "improper new epoch");

    epoch_principal.push(0);
    total_dsec.push(0);
    SFI_earned.push(0);

    dsec_token_addresses.push(saffron_LP_dsec_token_address);
    principal_token_addresses.push(saffron_LP_principal_token_address);

    // Token info for looking up epoch and tranche of dsec tokens by token contract address
    saffron_LP_token_info[saffron_LP_dsec_token_address] = SaffronAMMLPTokenInfo({
      exists: true,
      epoch: epoch,
      token_type: LPTokenType.dsec
    });

    // Token info for looking up epoch and tranche of PRINCIPAL tokens by token contract address
    saffron_LP_token_info[saffron_LP_principal_token_address] = SaffronAMMLPTokenInfo({
      exists: true,
      epoch: epoch,
      token_type: LPTokenType.principal
    });
  }

  event DsecGeneration(uint256 time_remaining, uint256 amount, uint256 dsec, address dsec_address, uint256 epoch, uint256 tranche, address user_address, address principal_token_addr);
  event AddLiquidity(uint256 new_pool_principal, uint256 new_epoch_principal, uint256 new_total_dsec);
  // LP user adds liquidity to the pool
  // Pre-requisite (front-end): have user approve transfer on front-end to base asset using our contract address
  function add_liquidity(uint256 amount, Tranche tranche) external override {
    require(!_shutdown, "pool shutdown");
    require(tranche == Tranche.S, "AMM pool has no tranches");
    uint256 epoch = get_current_epoch();
    require(amount != 0, "can't add 0");
    require(epoch == 1, "v1: must be epoch 1 only");

    // Calculate the dsec for deposited Uniswap V2 LP tokens
    uint256 dsec = amount.mul(get_seconds_until_epoch_end(epoch));

    // Update pool principal eternal and epoch state
    pool_principal = pool_principal.add(amount);                 // Add Uniswap V2 LP token amount to pool principal total 
    epoch_principal[epoch] = epoch_principal[epoch].add(amount); // Add Uniswap V2 LP token amount to principal epoch total

    // Update dsec and principal balance state
    total_dsec[epoch] = total_dsec[epoch].add(dsec);

    // Transfer Uniswap V2 LP tokens from LP to pool
    IERC20(base_asset_address).safeTransferFrom(msg.sender, address(this), amount);

    // Mint Saffron LP epoch 1 AMM dsec tokens and transfer them to sender
    SaffronLPBalanceToken(dsec_token_addresses[epoch]).mint(msg.sender, dsec);

    // Mint Saffron LP epoch 1 AMM principal tokens and transfer them to sender
    SaffronLPBalanceToken(principal_token_addresses[epoch]).mint(msg.sender, amount);

    emit DsecGeneration(get_seconds_until_epoch_end(epoch), amount, dsec, dsec_token_addresses[epoch], epoch, uint256(tranche), msg.sender, principal_token_addresses[epoch]);
    emit AddLiquidity(pool_principal, epoch_principal[epoch], total_dsec[epoch]);
  }


  event WindDownEpochState(uint256 previous_epoch, uint256 SFI_earned, uint256 epoch_dsec);
  function wind_down_epoch(uint256 epoch, uint256 amount_sfi) public override {
    require(msg.sender == address(strategy), "must be strategy");
    require(!epoch_wound_down[epoch], "epoch already wound down");
    uint256 current_epoch = get_current_epoch();
    require(epoch < current_epoch, "cannot wind down future epoch");

    uint256 previous_epoch = current_epoch - 1;
    require(block.timestamp >= get_epoch_end(previous_epoch), "can't call before epoch ended");

    SFI_earned[epoch] = amount_sfi;

    // Total dsec
    uint256 epoch_dsec = total_dsec[epoch];
    epoch_wound_down[epoch] = true;
    emit WindDownEpochState(previous_epoch, SFI_earned[epoch], epoch_dsec);
  }

  event RemoveLiquidityDsec(uint256 dsec_percent, uint256 SFI_owned);
  event RemoveLiquidityPrincipal(uint256 principal);
  function remove_liquidity(address dsec_token_address, uint256 dsec_amount, address principal_token_address, uint256 principal_amount) external override {
    require(dsec_amount > 0 || principal_amount > 0, "can't remove 0");
    uint256 SFI_owned;
    uint256 dsec_percent;

    // Update state for removal via dsec token
    if (dsec_token_address != address(0x0) && dsec_amount > 0) {
      // Get info about the v1 dsec token from its address and check that it exists
      SaffronAMMLPTokenInfo memory token_info = saffron_LP_token_info[dsec_token_address];
      require(token_info.exists, "balance token lookup failed");
      SaffronLPBalanceToken sbt = SaffronLPBalanceToken(dsec_token_address);
      require(sbt.balanceOf(msg.sender) >= dsec_amount, "insufficient dsec balance");

      // Token epoch must be a past epoch
      uint256 token_epoch = token_info.epoch;
      require(token_info.token_type == LPTokenType.dsec, "bad dsec address");
      require(token_epoch == 1, "v1: bal token epoch must be 1");
      require(epoch_wound_down[token_epoch], "can't remove from wound up epoch");

      // Dsec gives user claim over a tranche's earned SFI and interest
      dsec_percent = dsec_amount.mul(1 ether).div(total_dsec[token_epoch]);
      SFI_owned = SFI_earned[token_epoch].mul(dsec_percent) / 1 ether;
      SFI_earned[token_epoch] = SFI_earned[token_epoch].sub(SFI_owned);
      total_dsec[token_epoch] = total_dsec[token_epoch].sub(dsec_amount);
    }

    // Update state for removal via principal token
    if (principal_token_address != address(0x0) && principal_amount > 0) {
      // Get info about the v1 dsec token from its address and check that it exists
      SaffronAMMLPTokenInfo memory token_info = saffron_LP_token_info[principal_token_address];
      require(token_info.exists, "balance token info lookup failed");
      SaffronLPBalanceToken sbt = SaffronLPBalanceToken(principal_token_address);
      require(sbt.balanceOf(msg.sender) >= principal_amount, "insufficient principal balance");

      // Token epoch must be a past epoch
      uint256 token_epoch = token_info.epoch;
      require(token_info.token_type == LPTokenType.principal, "bad balance token address");
      require(token_epoch == 1, "v1: bal token epoch must be 1");
      require(epoch_wound_down[token_epoch], "can't remove from wound up epoch");

      epoch_principal[token_epoch] = epoch_principal[token_epoch].sub(principal_amount);
      pool_principal = pool_principal.sub(principal_amount);
    }

    // Transfer
    if (dsec_token_address != address(0x0) && dsec_amount > 0) {
      SaffronLPBalanceToken sbt = SaffronLPBalanceToken(dsec_token_address);
      require(sbt.balanceOf(msg.sender) >= dsec_amount, "insufficient dsec balance");
      sbt.burn(msg.sender, dsec_amount);
      IERC20(SFI_address).safeTransfer(msg.sender, SFI_owned);
      emit RemoveLiquidityDsec(dsec_percent, SFI_owned);
    }
    if (principal_token_address != address(0x0) && principal_amount > 0) {
      SaffronLPBalanceToken sbt = SaffronLPBalanceToken(principal_token_address);
      require(sbt.balanceOf(msg.sender) >= principal_amount, "insufficient principal balance");
      sbt.burn(msg.sender, principal_amount);
      IERC20(base_asset_address).safeTransfer(msg.sender, principal_amount);
      emit RemoveLiquidityPrincipal(principal_amount);
    }

    require((dsec_token_address != address(0x0) && dsec_amount > 0) || (principal_token_address != address(0x0) && principal_amount > 0), "no action performed");
  }

  function hourly_strategy(address) external pure override {
    return;
  }

  function shutdown() external override {
    require(msg.sender == strategy, "must be strategy");
    require(block.timestamp > get_epoch_end(1) - 1 days, "trying to shutdown too early");
    _shutdown = true;
  }

  /*** GOVERNANCE ***/
  function set_governance(address to) external override {
    require(msg.sender == governance, "must be governance");
    governance = to;
  }

  function set_base_asset_address(address to) public {
    require(msg.sender == governance, "must be governance");
    base_asset_address = to;
  }

  /*** TIME UTILITY FUNCTIONS ***/
  function get_epoch_end(uint256 epoch) public view returns (uint256) {
    return epoch_cycle.start_date.add(epoch.add(1).mul(epoch_cycle.duration));
  }

  function get_current_epoch() public view returns (uint256) {
    require(block.timestamp > epoch_cycle.start_date, "before epoch 0");
    return (block.timestamp - epoch_cycle.start_date) / epoch_cycle.duration;
  }

  function get_seconds_until_epoch_end(uint256 epoch) public view returns (uint256) {
    return epoch_cycle.start_date.add(epoch.add(1).mul(epoch_cycle.duration)).sub(block.timestamp);
  }

  /*** GETTERS ***/
  function get_epoch_cycle_params() external view override returns (uint256, uint256) {
    return (epoch_cycle.start_date, epoch_cycle.duration);
  }

  function get_base_asset_address() external view override returns(address) {
    return base_asset_address;
  }

  event ErcSwept(address who, address to, address token, uint256 amount);
  function erc_sweep(address _token, address _to) public {
    require(msg.sender == governance, "must be governance");
    require(_token != base_asset_address, "cannot sweep pool assets");

    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    tkn.safeTransfer(_to, tBal);

    emit ErcSwept(msg.sender, _to, _token, tBal);
  }
}
