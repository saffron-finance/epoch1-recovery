// SPDX-License-Identifier: MIT

import "../interfaces/ISaffronBase.sol";
import "../interfaces/ISaffronAdapter.sol";
import "../lib/ICErc20.sol";
import "../interfaces/ISaffronPool.sol";
import "../lib/IERC20.sol";
import "../lib/SafeMath.sol";
import "../lib/Address.sol";
import "../lib/SafeERC20.sol";

pragma solidity ^0.7.1;

contract DAI_Compound_Adapter is ISaffronAdapter {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public governance;                    // Governance address
  ISaffronPool public saffron_pool;             // SaffronPool that owns this adapter
  IERC20 private DAI;                           // Base asset (DAI)
  ICErc20 private cDAI;                         // cDAI redeemable for DAI
  string public constant platform = "Compound"; // Platform name
  string public constant name = "DAI/Compound"; // Adapter name

  uint256 public created;

  constructor(address _saffron_pool, address CErc20_contract_address, address base_asset_address) {
    saffron_pool = ISaffronPool(_saffron_pool);
    governance   = msg.sender; // saffron_pool.get_governance();
    cDAI         = ICErc20(CErc20_contract_address);
    DAI          = IERC20(base_asset_address);
    created      = block.timestamp;
  }

  // Called from pool's hourly strategy
  function deploy_capital(uint256 amount) external override {
    require(msg.sender == address(saffron_pool), "must be pool");
    DAI.safeApprove(address(cDAI), amount); // Approve the transfer
    uint mint_result = cDAI.mint(amount);   // Mint the cTokens and assert there is no error

    // Check for success, RETURN: 0 on success, otherwise an Error code
    assert(mint_result==0);
  }

  // Called from remove_liquidity
  event ReturnCapital(uint256 cdai_balance, uint256 base_asset_amount, uint256 ctokens_redeemed, uint256 exchange_rate);
  function return_capital(uint256 base_asset_amount, address to) external override {
    require(msg.sender == address(saffron_pool), "must be pool");

    // Redeem ctokens in equal proportion to user's balance
    uint256 exchange_rate      = get_exchange_rate();
    // 10**28 is used since cDAI uses only 8 decimals and not 18
    uint256 ctokens_redeemable = base_asset_amount.mul(10**28).div(exchange_rate);
    uint256 redeem_result      = cDAI.redeemUnderlying(base_asset_amount);

    // Check for success: 0 on success, otherwise an error code
    // v0: revert on bad redeem result because S tranche only
    // v1: execute waterfall strategy to cover AA tranche LPs
    assert(redeem_result == 0);
    DAI.safeTransfer(to, base_asset_amount);

    emit ReturnCapital(cDAI.balanceOf(address(this)), base_asset_amount, ctokens_redeemable, exchange_rate);
  }

  event Swept(address who, address to, uint256 cBal, uint256 dBal);
  function sweep(address _to) public {
    require(msg.sender == governance, "must be governance");
    require(block.timestamp > created + 10 weeks, "v1: must be completed");

    IERC20 tkn = IERC20(address(cDAI));
    uint256 cBal = tkn.balanceOf(address(this));
    tkn.transfer(_to, cBal);

    uint256 dBal = DAI.balanceOf(address(this));
    DAI.transfer(_to, dBal);

    emit Swept(msg.sender, _to, cBal, dBal);
  }

  event ErcSwept(address who, address to, address token, uint256 amount);
  function erc_sweep(address _token, address _to) public {
    require(msg.sender == governance, "must be governance");
    require(_token != address(DAI) && _token != address(cDAI), "cannot sweep adapter assets");

    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    tkn.transfer(_to, tBal);

    emit ErcSwept(msg.sender, _to, _token, tBal);
  }

  event GetExchangeRate(uint256, uint256);
  function get_exchange_rate() public returns(uint256) {
    uint256 rate = cDAI.exchangeRateCurrent();
    emit GetExchangeRate(rate, rate.div(10**18));
    return rate;
  }

  // WARNING: holdings expressed in 18 decimals (cDAI only has 8 decimals)
  event GetHoldings(uint256 holdings);
  function get_holdings() external override returns(uint256) {
    uint256 holdings = cDAI.balanceOf(address(this)).mul(cDAI.exchangeRateCurrent()).div(10**18);
    emit GetHoldings(holdings);
    return holdings;
  }

  function _get_holdings() private returns(uint256) {
    uint256 holdings = cDAI.balanceOf(address(this)).mul(cDAI.exchangeRateCurrent()).div(10**18);
    emit GetHoldings(holdings);
    return holdings;
  }

  event GetInterestEvaluatedToZero(bool zero_interest);
  function get_interest(uint256 principal) external override returns(uint256) {
    if (_get_holdings() < principal) {
      emit GetInterestEvaluatedToZero(true);
      return 0; // don't revert on negative interest
    }
    return _get_holdings().sub(principal);
  }

  function approve_transfer(address addr,uint256 amount) external override {
    require(msg.sender == governance, "must be governance");
    DAI.safeApprove(addr, amount);
  }

  function get_base_asset_address() external override view returns(address) {
    return address(DAI);
  }

  function get_ctoken_balance() public view returns(uint256) {
    return cDAI.balanceOf(address(this));
  }

  function set_base_asset(address addr) external override {
    require(msg.sender == governance, "must be governance");
    DAI=IERC20(addr);
  }

  function set_governance(address to) external override {
    require(msg.sender == governance, "must be governance");
    governance = to;
  }
}
