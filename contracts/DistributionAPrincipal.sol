// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionAPrincipal is DistributionBase {
  
  address public DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public lp_token_address = 0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5;
  uint256 public A_PRINCIPAL_AMOUNT = 4239020891056530000000000;

  constructor() DistributionBase(DAI, lp_token_address, A_PRINCIPAL_AMOUNT) {

  }

}

