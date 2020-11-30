

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionAInterest is DistributionBase {
  
  address public DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public lp_token_address = 0x28DcafcbF29A502B33a719d726B0E723A73b6AD3;
  uint256 public A_INTEREST_EARNED = 47795853357341105935610;

  constructor() public DistributionBase(DAI, lp_token_address, A_INTEREST_EARNED) {

  }

}

