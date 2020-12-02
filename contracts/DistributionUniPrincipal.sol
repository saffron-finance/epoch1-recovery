// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionUniPrincipal is DistributionBase {
  
  address public UNI = 0xC76225124F3CaAb07f609b1D147a31de43926cd6;
  address public lp_token_address = 0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d;
  uint256 public UNI_PRINCIPAL_AMOUNT = 4217195425373693533612;

  constructor() DistributionBase(UNI, lp_token_address, UNI_PRINCIPAL_AMOUNT) {

  }

}

