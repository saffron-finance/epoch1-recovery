// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "../lib/IERC20.sol";

interface IDistributionBase {
  function get_fund_rescue() external returns(address);
}
