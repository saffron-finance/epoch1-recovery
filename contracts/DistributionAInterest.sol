// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./interfaces/ISaffronPool.sol";
import "./interfaces/ISaffronAdapter.sol";
import "./lib/SafeMath.sol";
import "./lib/IERC20.sol";
import "./lib/SafeERC20.sol";

contract DistributionAInterest {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public governance;

  // Existing on-chain contracts
  IERC20 public constant SFI = IERC20(0xb753428af26E81097e7fD17f40c88aaA3E04902c);

  // S dsec https://etherscan.io/token/0x28DcafcbF29A502B33a719d726B0E723A73b6AD3
  address _lp_token_address = 0x28DcafcbF29A502B33a719d726B0E723A73b6AD3;

  // Constant earnings and principal amounts (epoch 1 wound down already):
  uint256 public constant A_INTEREST_EARNED = 47795853357341105935610;

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
    SFI.transfer(msg.sender, amount.mul(1 ether).div(lp_token.totalSupply()).mul(A_INTEREST_EARNED).div(1 ether));
  }

  event ErcSwept(address who, address to, address token, uint256 amount);
  function erc_sweep(address _token, address _to) public onlyGovernance {
    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    emit ErcSwept(msg.sender, _to, _token, tBal);
    tkn.safeTransfer(_to, tBal);
  }
}

