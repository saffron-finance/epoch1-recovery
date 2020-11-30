// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionSInterest is DistributionBase {
  
  address public DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public lp_token_address = 0x372Bc201134676c846F1fd07a2a059Fd18526De3;
  uint256 public S_INTEREST_EARNED = 38577996099131004531621;

  constructor() DistributionBase(DAI, lp_token_address, S_INTEREST_EARNED) {

  }

}

