// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./interfaces/ISaffronPool.sol";
import "./interfaces/ISaffronAdapter.sol";
import "./lib/SafeMath.sol";
import "./lib/IERC20.sol";
//import "./lib/ERC20.sol";
import "./lib/SafeERC20.sol";

contract Epoch1Recovery {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public governance;

  // Existing on-chain contracts
  ISaffronPool public constant DAI_POOL = ISaffronPool(0x70D8682DDdD33571722D14aa327049DaD869AEE9); // https://etherscan.io/address/0x70d8682dddd33571722d14aa327049dad869aee9
  ISaffronPool public constant UNI_POOL = ISaffronPool(0x69ec762faacD5B95eD19E99233E2B5176B366aa3); // https://etherscan.io/address/0x69ec762faacD5B95eD19E99233E2B5176B366aa3

  IERC20 public constant DAI = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
  IERC20 public constant SFI = IERC20(0xb753428af26E81097e7fD17f40c88aaA3E04902c);
  IERC20 public constant UNI = IERC20(0xC76225124F3CaAb07f609b1D147a31de43926cd6);

  address[] lp_token_addresses = [
    0x372Bc201134676c846F1fd07a2a059Fd18526De3, // S dsec        https://etherscan.io/token/0x372Bc201134676c846F1fd07a2a059Fd18526De3
    0x9be973b1496E28b3b745742391B0E5977184f1AC, // S principal   https://etherscan.io/token/0x9be973b1496E28b3b745742391B0E5977184f1AC
    0x28DcafcbF29A502B33a719d726B0E723A73b6AD3, // A dsec        https://etherscan.io/token/0x28DcafcbF29A502B33a719d726B0E723A73b6AD3
    0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5, // A principal   https://etherscan.io/token/0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5
    0x19e5a60c1646c921aC592409548d1bCe5B071Faa, // UNI dsec      https://etherscan.io/token/0x19e5a60c1646c921ac592409548d1bce5b071faa
    0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d  // UNI principal https://etherscan.io/token/0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d
  ];
  
  // Require the address exists to redeem it
  mapping(address=>bool) public address_exists;

  // For calculated ratios (scaled up by 10**18)
  mapping(address=>uint256) public DAI_ratio;
  mapping(address=>uint256) public SFI_ratio;
  mapping(address=>uint256) public UNI_ratio;

  bool public ratios_set;

  // Constant earnings (epoch 1 wound down already):
  uint256 public constant S_INTEREST_EARNED = 38577996099131004531621;
  uint256 public constant A_INTEREST_EARNED = 47795853357341105935610;
  uint256 public constant S_SFI_EARNED = 10687500000000000000000;
  uint256 public constant A_SFI_EARNED = 562500000000000000000;
  uint256 public constant UNI_SFI_EARNED = 3750000000000000000000; 

  constructor() {
    for (uint256 i = 0; i < lp_token_addresses.length; i++) {
      address_exists[lp_token_addresses[i]] = true;
    }
    governance = msg.sender;
  }

  event Redeem(address lp_token_address, uint256 amount, address msg_sender);
  function redeem(address lp_token_address, uint256 amount) public {
    require(address_exists[lp_token_address], "token does not exist");
    require(ratios_set, "ratios not yet set");
    
    IERC20 lp_token = IERC20(lp_token_address); 
    lp_token.transferFrom(msg.sender, 0x0000000000000000000000000000000000000000, amount);

    emit Redeem(lp_token_address, amount, msg.sender);
    DAI.transfer(msg.sender, DAI_ratio[lp_token_address].mul(amount).div(1 ether));
    SFI.transfer(msg.sender, SFI_ratio[lp_token_address].mul(amount).div(1 ether));
    UNI.transfer(msg.sender, SFI_ratio[lp_token_address].mul(amount).div(1 ether));
  }

  function set_ratios() public {
    require(msg.sender == governance);
    require(!ratios_set, "ratios already set");

    // S tranche dsec/principal ratios
    DAI_ratio[0x372Bc201134676c846F1fd07a2a059Fd18526De3] = 830488116;
    SFI_ratio[0x372Bc201134676c846F1fd07a2a059Fd18526De3] = 230075240;
    DAI_ratio[0x9be973b1496E28b3b745742391B0E5977184f1AC] = 1 ether;

    // A tranche dsec/principal ratios
    DAI_ratio[0x28DcafcbF29A502B33a719d726B0E723A73b6AD3] = 17565211677;
    SFI_ratio[0x28DcafcbF29A502B33a719d726B0E723A73b6AD3] = 206721522;
    DAI_ratio[0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5] = 1 ether;
    SFI_ratio[0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5] = 1 ether / 1000;

    // UNI LP dsec/principal ratios
    SFI_ratio[0x19e5a60c1646c921aC592409548d1bCe5B071Faa] = 842585356421;
    UNI_ratio[0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d] = 1 ether;
  }
  
  event ErcSwept(address who, address to, address token, uint256 amount);
  function erc_sweep(address _token, address _to) public {
    require(msg.sender == governance, "must be governance");
    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    tkn.safeTransfer(_to, tBal);
    emit ErcSwept(msg.sender, _to, _token, tBal);
  }
}
