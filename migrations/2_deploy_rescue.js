//const {BN} = require('@openzeppelin/test-helpers');

// Address Book
const assets = require('../address_book.js');

// Library contracts
const ERC20 = artifacts.require('ERC20');
const ICErc20 = artifacts.require('ICErc20');
const DAI = artifacts.require('ERC20');

// Test
const DAI_Compound_Adapter_artifact = artifacts.require('DAI_Compound_Adapter');

// Saffron
const DAI_Compound_Adapter = artifacts.require('ISaffronAdapter');
const SaffronUniswapLPPool = artifacts.require('SaffronUniswapLPPool');

const dsec_S = artifacts.require('SaffronLPBalanceToken');
const principal_S = artifacts.require('SaffronLPBalanceToken');
const dsec_A = artifacts.require('SaffronLPBalanceToken');
const principal_A = artifacts.require('SaffronLPBalanceToken');
const dsec_uniswap = artifacts.require('SaffronLPBalanceToken');
const principal_uniswap = artifacts.require('SaffronLPBalanceToken');

// Epoch 1 Recovery
const fundRescueArtifact = artifacts.require('FundRescue');
const distributionBase = artifacts.require('DistributionBase');
const distributionSInterestArtifact = artifacts.require('DistributionSInterest');
const distributionSPrincipalArtifact = artifacts.require('DistributionSPrincipal');
const distributionAInterestArtifact = artifacts.require('DistributionAInterest');
const distributionAPrincipalArtifact = artifacts.require('DistributionAPrincipal');
const distributionUniSFIArtifact = artifacts.require('DistributionUniSFI');
const distributionUniPrincipalArtifact = artifacts.require('DistributionUniPrincipal');

// Constants
const ZERO_BN = web3.utils.toBN("0");
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const DAI_MCD_JOIN = '0x9759A6Ac90977b93B58547b4A71c78317f391A28';

let ADAPTER_CDAI_BAL = web3.utils.toBN(web3.utils.toWei("2661640705.22239553", "ether")).div(web3.utils.toBN("10000000000"));
let S_INTEREST_EARNED = web3.utils.toBN("38577996099131004531621");
let S_PRINCIPAL_AMOUNT = web3.utils.toBN("51029966983206580100000000");
let A_INTEREST_EARNED = web3.utils.toBN("47795853357341105935610");
let A_PRINCIPAL_AMOUNT = web3.utils.toBN("4239020891056530000000000");
let DAI_TOTAL = S_INTEREST_EARNED.add(S_PRINCIPAL_AMOUNT).add(A_INTEREST_EARNED).add(A_PRINCIPAL_AMOUNT);

let UNI_SFI_EARNED = web3.utils.toBN("3750000000000000000000");
let UNI_PRINCIPAL_AMOUNT = web3.utils.toBN("4217195425373693533612");

async function wait(seconds) {
  process.stdout.write("waiting... " + (seconds / 1000).toString() + "..... ");
  await new Promise(r => setTimeout(r, seconds-3000));
  process.stdout.write("3... ");
  await new Promise(r => setTimeout(r, 1000));
  process.stdout.write("2... ");
  await new Promise(r => setTimeout(r, 1000));
  process.stdout.write("1...\n");
  await new Promise(r => setTimeout(r, 1000));
}

module.exports = async function(deployer, network, accounts) {
  let governance = accounts[0];
  let mock = {};
  let contracts = {};
  mock.DAI_Compound_Adapter = await DAI_Compound_Adapter_artifact.new(accounts[0], assets[network]["cDAI"], assets[network]["DAI"], {from: governance});
  console.log("Deployed mock DAI_Compound_Adapter at " + mock.DAI_Compound_Adapter.address);

  // Deploy Distribution* contracts
  contracts.distributionSInterest = await distributionSInterestArtifact.new({from: governance, gas: 1900000});
  contracts.distributionSPrincipal = await distributionSPrincipalArtifact.new({from: governance, gas: 1900000});
  contracts.distributionAInterest = await distributionAInterestArtifact.new({from: governance, gas: 1900000});
  contracts.distributionAPrincipal = await distributionAPrincipalArtifact.new({from: governance, gas: 1900000});
  contracts.distributionUniSFI = await distributionUniSFIArtifact.new({from: governance, gas: 1900000});
  contracts.distributionUniPrincipal = await distributionUniPrincipalArtifact.new({from: governance});
  console.log("Distribution contracts deployed:\n  "
    + contracts.distributionSInterest.address + " DistributionSInterest contract\n  "
    + contracts.distributionSPrincipal.address + " DistributionSPrincipal contract\n  "
    + contracts.distributionAInterest.address + " DistributionAInterest contract\n  "
    + contracts.distributionAPrincipal.address + " DistributionAPrincipal contract\n  "
    + contracts.distributionUniSFI.address + " DistributionUniSFI contract\n  "
    + contracts.distributionUniPrincipal.address + " DistributionUniPrincipal contract");

  // Check LP token addresses match expected values
  console.log("Distribution* contracts deployed with LP token values:\n  " +
    (await contracts.distributionSInterest.lp_token_address()).toString() + " 0x372Bc201134676c846F1fd07a2a059Fd18526De3 s_dsec\n  " +
    (await contracts.distributionSPrincipal.lp_token_address()).toString() + " 0x9be973b1496E28b3b745742391B0E5977184f1AC s_principal\n  " +
    (await contracts.distributionAInterest.lp_token_address()).toString() + " 0x28DcafcbF29A502B33a719d726B0E723A73b6AD3 a_dsec\n  " +
    (await contracts.distributionAPrincipal.lp_token_address()).toString() + " 0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5 a_principal\n  " +
    (await contracts.distributionUniSFI.lp_token_address()).toString() + " 0x19e5a60c1646c921aC592409548d1bCe5B071Faa uni_sfi\n  " +
    (await contracts.distributionUniPrincipal.lp_token_address()).toString() + " 0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d uni_principal");
  await wait(12500);
  

  // Deploy FundRescue contract
  contracts.fundRescue = await fundRescueArtifact.new(contracts.distributionSInterest.address, contracts.distributionSPrincipal.address, contracts.distributionAInterest.address, contracts.distributionAPrincipal.address, contracts.distributionUniSFI.address, contracts.distributionUniPrincipal.address, {from: governance, gas: 2900000});

  // Verify FundRescue contract has the correct values for each Distribution* contract
  console.log("FundRescue contract deployed:\n  " + contracts.fundRescue.address + " FundRescue contract");
  console.log("FundRescue contract deployed with LP token values:\n  " +
    (await contracts.fundRescue.distribution_contract_s_dsec()).toString() + " s_dsec\n  " +
    (await contracts.fundRescue.distribution_contract_s_principal()).toString() + " s_principal\n  " +
    (await contracts.fundRescue.distribution_contract_a_dsec()).toString() + " a_dsec\n  " +
    (await contracts.fundRescue.distribution_contract_a_principal()).toString() + " a_principal\n  " +
    (await contracts.fundRescue.distribution_contract_uni_sfi()).toString() + " uni_sfi\n  " +
    (await contracts.fundRescue.distribution_contract_uni_principal()).toString() + " uni_principal");
  await wait(20000);

  // Set governance on FundRescue contract
  await contracts.distributionSInterest.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});
  await contracts.distributionSPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});
  await contracts.distributionAInterest.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});
  await contracts.distributionAPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});
  await contracts.distributionUniSFI.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});
  await contracts.distributionUniPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance, gas: 200000});

  console.log("Distribution* contracts deployed with FundRescue contract address set:\n  " +
    (await contracts.distributionSInterest.fund_rescue()).toString() + " distributionSInterest\n  " +
    (await contracts.distributionSPrincipal.fund_rescue()).toString() + " distributionSPrincipal\n  " +
    (await contracts.distributionAInterest.fund_rescue()).toString() + " distributionAInterest\n  " +
    (await contracts.distributionAPrincipal.fund_rescue()).toString() + " distributionAPrincipal\n  " +
    (await contracts.distributionUniSFI.fund_rescue()).toString() + " distributionUniSFI\n  " +
    (await contracts.distributionUniPrincipal.fund_rescue()).toString() + " distributionUniPrincipal");
  await wait(9000);

};
