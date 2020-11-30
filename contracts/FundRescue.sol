// SPDX-License-Identifier: MIT

pragma solidity ^0.7.1;

import "./lib/ICErc20.sol";
import "./lib/IERC20.sol";
import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";


interface DistributionContract {
  function depositFund() external;
}

contract FundRescue {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public adapter = 0xe158fA2595b4745CA73cB49D3caCDA3BE523AB98;

  IERC20 public  DAI = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
  IERC20 public  SFI = IERC20(0xb753428af26E81097e7fD17f40c88aaA3E04902c);
  IERC20 public  UNI = IERC20(0xC76225124F3CaAb07f609b1D147a31de43926cd6);

  address public cDAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;

  // Distribution contracts to be deployed later
  address public distribution_contract_s_dsec =   0x0000000000000000000000000000000000000000; // S dsec      
  address public distribution_contract_s_principal =   0x0000000000000000000000000000000000000000; // S principal
  address public distribution_contract_a_dsec =   0x0000000000000000000000000000000000000000; // A dsec 
  address public distribution_contract_a_principal =   0x0000000000000000000000000000000000000000; // A principal
  address public distribution_contract_uni_dsec =   0x0000000000000000000000000000000000000000; // UNI dsec
  address public distribution_contract_uni_principal =   0x0000000000000000000000000000000000000000; // UNI principal

  // Constant earnings and principal amounts (epoch 1 wound down already):
  uint256 public constant S_INTEREST_EARNED = 38577996099131004531621;
  uint256 public constant S_PRINCIPAL_AMOUNT = 51029966983206580100000000;
  uint256 public constant A_INTEREST_EARNED = 47795853357341105935610;
  uint256 public constant A_PRINCIPAL_AMOUNT = 4239020891056530000000000;

  uint256 public constant UNI_SFI_EARNED = 3750000000000000000000; 
  uint256 public constant UNI_PRINCIPAL_AMOUNT = 4217195425373693533612;

  constructor() public {
    governance = msg.sender;
  }

  modifier onlyGovernance() {
    require(msg.sender == governance, "only governance is allowed");
    _;
  }

  function daiRescue() public onlyGovernance {
    uint balanceOfDaiBefore = DAI.balanceOf(address(this));
    IERC20(cDAI).safeTransferFrom(adapter, address(this), IERC20(cDAI).balanceOf(adapter));

    uint c_balance = IERC20(cDAI).balanceOf(address(this));
    uint result = ICErc20(cDAI).redeem(c_balance);
    require(result == 0, "compound error");
    
    uint balanceOfDaiAfter = DAI.balanceOf(address(this));

    uint required_balance = 
      balanceOfDaiBefore + 
      S_INTEREST_EARNED + 
      S_PRINCIPAL_AMOUNT +
      A_INTEREST_EARNED +
      A_PRINCIPAL_AMOUNT;

  	require(balanceOfDaiAfter >= required_balance , "cDai wasn't converted or balance error");
  }
  
  function approveAndTransferFundsToDistributionContracts() public onlyGovernance {

    // S dsec (interest earned)
    DAI.approve(distribution_contract_s_dsec, S_INTEREST_EARNED);
    DistributionContract(distribution_contract_s_dsec).depositFund();

    // S principal (1:1 DAI)
    DAI.approve(distribution_contract_s_principal, S_PRINCIPAL_AMOUNT);
    DistributionContract(distribution_contract_s_principal).depositFund();
    
    // A dsec (interest earned)
    DAI.approve(distribution_contract_a_dsec, A_INTEREST_EARNED);
  	DistributionContract(distribution_contract_a_dsec).depositFund();
    
    // A principal (1:1 DAI)
    DAI.approve(distribution_contract_a_principal, A_PRINCIPAL_AMOUNT);
    DistributionContract(distribution_contract_a_principal).depositFund();
    
    // UNI dsec (SFI earned)
    SFI.approve(distribution_contract_uni_dsec, UNI_SFI_EARNED);
    DistributionContract(distribution_contract_uni_dsec).depositFund();
    
    // UNI principal (1:1 UNIV2)
    UNI.approve(distribution_contract_uni_principal, UNI_PRINCIPAL_AMOUNT);
    DistributionContract(distribution_contract_uni_principal).depositFund();
    
  }

  function erc_sweep(address _token, address _to) public onlyGovernance {
    IERC20 tkn = IERC20(_token);
    uint256 tBal = tkn.balanceOf(address(this));
    tkn.safeTransfer(_to, tBal);
  }
}
