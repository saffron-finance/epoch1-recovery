// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

interface ISaffronBase {
  enum Tranche {S, AA, A}
  enum LPTokenType {dsec, principal}

  // Store values (balances, dsec, vdsec) with TrancheUint256
  struct TrancheUint256 {
    uint256 S;
    uint256 AA;
    uint256 A;
  }

  struct epoch_params {
    uint256 start_date;       // Time when the platform launched
    uint256 duration;         // Duration of epoch
  }
}
