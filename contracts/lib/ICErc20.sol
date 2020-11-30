// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

// https://compound.finance/docs/ctokens
interface ICErc20 {
    function mint(uint256) external returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
    function supplyRatePerBlock() external returns (uint256);
    function redeem(uint) external returns (uint);
    function redeemUnderlying(uint) external returns (uint);
    function balanceOf(address owner) external view returns (uint);
}
