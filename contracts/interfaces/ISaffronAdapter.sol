// SPDX-License-Identifier: MIT

import "./ISaffronBase.sol";
pragma solidity ^0.7.1;

interface ISaffronAdapter is ISaffronBase {
    function deploy_capital(uint256 amount) external;
    function return_capital(uint256 base_asset_amount, address to) external;
    function approve_transfer(address addr,uint256 amount) external;
    function get_base_asset_address() external view returns(address);
    function set_base_asset(address addr) external;
    function get_holdings() external returns(uint256);
    function get_interest(uint256 principal) external returns(uint256);
    function set_governance(address to) external;
}
