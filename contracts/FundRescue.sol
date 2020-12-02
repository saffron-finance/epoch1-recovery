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

  address public governance;

  address public adapter = 0xe158fA2595b4745CA73cB49D3caCDA3BE523AB98;

  IERC20 public  DAI = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
  IERC20 public  SFI = IERC20(0xb753428af26E81097e7fD17f40c88aaA3E04902c);
  IERC20 public  UNI = IERC20(0xC76225124F3CaAb07f609b1D147a31de43926cd6);

  ICErc20 private cDAI = ICErc20(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
  address public cDAI_address = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;

  // Distribution contracts to be deployed later
  address public distribution_contract_s_dsec;        // S dsec contract
  address public distribution_contract_s_principal;   // S principal contract
  address public distribution_contract_a_dsec;        // A dsec contract
  address public distribution_contract_a_principal;   // A principal contract
  address public distribution_contract_uni_sfi;       // UNI SFI contract
  address public distribution_contract_uni_principal; // UNI principal contract

  // Constant earnings and principal amounts (epoch 1 wound down already):
  uint256 public constant S_INTEREST_EARNED = 38577996099131004531621;
  uint256 public constant S_PRINCIPAL_AMOUNT = 51029966983206580100000000;
  uint256 public constant A_INTEREST_EARNED = 47795853357341105935610;
  uint256 public constant A_PRINCIPAL_AMOUNT = 4239020891056530000000000;

  uint256 public constant UNI_SFI_EARNED = 3750000000000000000000; 
  uint256 public constant UNI_PRINCIPAL_AMOUNT = 4217195425373693533612;

  constructor(
    address _distribution_contract_s_dsec,
    address _distribution_contract_s_principal,
    address _distribution_contract_a_dsec,
    address _distribution_contract_a_principal,
    address _distribution_contract_uni_sfi,
    address _distribution_contract_uni_principal ) {
    distribution_contract_s_dsec = _distribution_contract_s_dsec;
    distribution_contract_s_principal = _distribution_contract_s_principal;
    distribution_contract_a_dsec = _distribution_contract_a_dsec;
    distribution_contract_a_principal = _distribution_contract_a_principal;
    distribution_contract_uni_sfi = _distribution_contract_uni_sfi;
    distribution_contract_uni_principal = _distribution_contract_uni_principal;
    governance = msg.sender;
  }

  modifier onlyGovernance() {
    require(msg.sender == governance, "only governance is allowed");
    _;
  }

  function rescuecDAI() public onlyGovernance {
    uint balanceOfcDaiBefore = IERC20(address(cDAI)).balanceOf(address(this));
    IERC20(address(cDAI)).safeTransferFrom(adapter, address(this), IERC20(address(cDAI)).balanceOf(adapter));
    require(IERC20(address(cDAI)).balanceOf(address(this)) > balanceOfcDaiBefore, "cDAI transferFrom transferred 0 cDAI");
  }

  function redeemDai() public onlyGovernance {
    uint balanceOfDaiBefore = DAI.balanceOf(address(this));

    uint required_balance = balanceOfDaiBefore + S_INTEREST_EARNED + S_PRINCIPAL_AMOUNT + A_INTEREST_EARNED + A_PRINCIPAL_AMOUNT;
    // Update COMP exchange rate to avoid MARKET_NOT_FRESH
    uint rate = cDAI.exchangeRateCurrent();
    require(rate > 0, "bad exchange rate");

    uint c_balance = IERC20(cDAI_address).balanceOf(address(this));
    require(c_balance > 0, "cDAI balance is 0");

    uint result = cDAI.redeem(c_balance);
    require(result != 1, "UNAUTHORIZED");
    require(result != 2, "BAD_INPUT");
    require(result != 3, "COMPTROLLER_REJECTION");
    require(result != 4, "COMPTROLLER_CALCULATION_ERROR");
    require(result != 5, "INTEREST_RATE_MODEL_ERROR");
    require(result != 6, "INVALID_ACCOUNT_PAIR");
    require(result != 7, "INVALID_CLOSE_AMOUNT_REQUESTED");
    require(result != 8, "INVALID_COLLATERAL_FACTOR");
    require(result != 9, "MATH_ERROR");
    require(result != 10, "MARKET_NOT_FRESH");
    require(result != 11, "MARKET_NOT_LISTED");
    require(result != 12, "TOKEN_INSUFFICIENT_ALLOWANCE");
    require(result != 13, "TOKEN_INSUFFICIENT_BALANCE");
    require(result != 14, "TOKEN_INSUFFICIENT_CASH");
    require(result != 15, "TOKEN_TRANSFER_IN_FAILED");
    require(result != 16, "TOKEN_TRANSFER_OUT_FAILED");
    require(result == 0, "compound error");
    
    uint balanceOfDaiAfter = DAI.balanceOf(address(this));

  	require(balanceOfDaiAfter >= required_balance , "cDai wasn't converted or balance error");
  }
  
  function approveAndTransferFundsToDistributionContracts() public onlyGovernance {
    require(DAI.balanceOf(address(this)) >= S_INTEREST_EARNED + S_PRINCIPAL_AMOUNT + A_INTEREST_EARNED + A_PRINCIPAL_AMOUNT, "insufficient DAI for distribution");

    // S dsec (DAI interest earned)
    DAI.approve(distribution_contract_s_dsec, S_INTEREST_EARNED);
    DistributionContract(distribution_contract_s_dsec).depositFund();

    // S principal (1:1 DAI)
    DAI.approve(distribution_contract_s_principal, S_PRINCIPAL_AMOUNT);
    DistributionContract(distribution_contract_s_principal).depositFund();
    
    // A dsec (DAI interest earned)
    DAI.approve(distribution_contract_a_dsec, A_INTEREST_EARNED);
  	DistributionContract(distribution_contract_a_dsec).depositFund();
    
    // A principal (1:1 DAI)
    DAI.approve(distribution_contract_a_principal, A_PRINCIPAL_AMOUNT);
    DistributionContract(distribution_contract_a_principal).depositFund();
    
    // UNI dsec (SFI earned)
    SFI.approve(distribution_contract_uni_sfi, UNI_SFI_EARNED);
    DistributionContract(distribution_contract_uni_sfi).depositFund();
    
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
