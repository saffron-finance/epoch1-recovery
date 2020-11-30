// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./interfaces/ISaffronPool.sol";
import "./interfaces/ISaffronAdapter.sol";
import "./lib/SafeMath.sol";
import "./lib/IERC20.sol";
import "./lib/SafeERC20.sol";

contract DistributionUniPrincipal {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public governance;

  // Existing on-chain contracts
  IERC20 public constant UNI = IERC20(0xC76225124F3CaAb07f609b1D147a31de43926cd6);

  // S dsec https://etherscan.io/token/0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d
  address _lp_token_address = 0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d;

  // Constant earnings and principal amounts (epoch 1 wound down already):
  uint256 public constant UNI_PRINCIPAL_AMOUNT = 4217195425373693533612;

  constructor() {
    governance = msg.sender;
  }

  modifier onlyGovernance() {
  	require(msg.sender == governance, "only governance is allowed");
  	_;
  }

  event Redeem(address lp_token_address, uint256 amount, address msg_sender);
  function redeem(address lp_token_address, uint256 amount) public {
    require(_lp_token_address == lp_token_address, "lp token mismatch");
    
    IERC20 lp_token = IERC20(lp_token_address); 

    emit Redeem(lp_token_address, amount, msg.sender);
    lp_token.transferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, amount);
    UNI.transfer(msg.sender, amount);
  }

  event ErcSwept(address who, address to, address token, uint256 amount);
  function erc_sweep(address _token, address _to) public onlyGovernance {
    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    emit ErcSwept(msg.sender, _to, _token, tBal);
    tkn.safeTransfer(_to, tBal);
  }
}


