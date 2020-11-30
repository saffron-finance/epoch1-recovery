

pragma solidity ^0.7.1;

import "./DistributionBase.sol";

contract DistributionUniSFI is DistributionBase {
  
  address public SFI = 0xb753428af26E81097e7fD17f40c88aaA3E04902c;
  address public lp_token_address = 0x19e5a60c1646c921aC592409548d1bCe5B071Faa;
  uint256 public UNI_SFI_EARNED = 3750000000000000000000;

  constructor() public DistributionBase(SFI, lp_token_address, UNI_SFI_EARNED) {

  }

}

