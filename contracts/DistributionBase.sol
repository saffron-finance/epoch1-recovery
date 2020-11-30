// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./lib/SafeMath.sol";
import "./lib/IERC20.sol";
import "./lib/SafeERC20.sol";

contract DistributionBase {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  bool public redeem_allowed;
  bool public deposit_done;

  address public governance;

  // Existing on-chain contracts
  IERC20 public underlying_token;
  IERC20 public lp_token;

  uint256 public total_distribution_amount;

  constructor(address _underlying_token, address _lp_token, uint _total_distribution_amount) {
    require(_total_distribution_amount > 0);
    require(_underlying_token != address(0x0));
    require(_lp_token != address(0x0));

    underlying_token = IERC20( _underlying_token );
    lp_token = IERC20( _lp_token);
    total_distribution_amount = _total_distribution_amount;
    
    governance = msg.sender;
    redeem_allowed = false;
    deposit_done = false;
  }

  modifier onlyGovernance() {
  	require(msg.sender == governance, "only governance is allowed");
  	_;
  }

  function redeem() public {
    require(redeem_allowed, "redeem not allowed yet")

    uint user_balance = lp_token.balanceOf(msg.sender);
    uint user_share = user_balance.mul(total_distribution_amount).div(lp_token.totalSupply());

    lp_token.safeTransferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, user_balance);
    underlying_token.safeTransfer(msg.sender, user_share);
  }

  function allowRedeem() public onlyGovernance {
    require(deposit_done, "fund should be deposited first");
    redeem_allowed = true;
  }

  function depositFund() public {
    underlying_token.safeTransferFrom(msg.sender, address(this), total_distribution_amount);
    deposit_done = true;
  }

  function erc_sweep(address _token, address _to) public onlyGovernance {
    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    tkn.safeTransfer(_to, tBal);
  }
}

