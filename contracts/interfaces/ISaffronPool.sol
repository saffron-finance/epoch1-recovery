// SPDX-License-Identifier: MIT

import "./ISaffronBase.sol";
pragma solidity ^0.7.1;

interface ISaffronPool is ISaffronBase {
  function add_liquidity(uint256 amount, Tranche tranche) external;
  function remove_liquidity(address v1_dsec_token_address, uint256 dsec_amount, address v1_principal_token_address, uint256 principal_amount) external;
  function get_base_asset_address() external view returns(address);
  function hourly_strategy(address adapter_address) external;
  function wind_down_epoch(uint256 epoch, uint256 amount_sfi) external;
  function set_governance(address to) external;
  function get_epoch_cycle_params() external view returns (uint256, uint256);
  function shutdown() external;
}
