

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionSPrincipal is DistributionBase {
  
  address public DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public lp_token_address = 0x9be973b1496E28b3b745742391B0E5977184f1AC;
  uint256 public S_PRINCIPAL_AMOUNT = 51029966983206580100000000;

  constructor() public DistributionBase(DAI, lp_token_address, S_PRINCIPAL_AMOUNT) {

  }

}

