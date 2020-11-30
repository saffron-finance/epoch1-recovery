const {expectRevert, time, constants, BN} = require('@openzeppelin/test-helpers');
const gtt = require('ganache-time-traveler');

// Address Book
const assets = require('../address_book.js');

// Library contracts
const ERC20 = artifacts.require('ERC20');
const ICErc20 = artifacts.require('ICErc20');
const DAI = artifacts.require('ERC20');

// Saffron
const DAI_Compound_Adapter = artifacts.require('ISaffronAdapter');
const SaffronUniswapLPPool = artifacts.require('ISaffronPool');

const dsec_S = artifacts.require('SaffronLPBalanceToken');
const principal_S = artifacts.require('SaffronLPBalanceToken');
const dsec_A = artifacts.require('SaffronLPBalanceToken');
const principal_A = artifacts.require('SaffronLPBalanceToken');
const dsec_uniswap = artifacts.require('SaffronLPBalanceToken');
const principal_uniswap = artifacts.require('SaffronLPBalanceToken');

// Epoch 1 Recovery
const distributionBase = artifacts.require('DistributionBase');
const fundRescueArtifact = artifacts.require('FundRescue');
const distributionSInterestArtifact = artifacts.require('DistributionSInterest');
const distributionSPrincipalArtifact = artifacts.require('DistributionSPrincipal');
const distributionAInterestArtifact = artifacts.require('DistributionAInterest');
const distributionAPrincipalArtifact = artifacts.require('DistributionAPrincipal');
const distributionUniSFIArtifact = artifacts.require('DistributionUniSFI');
const distributionUniPrincipalArtifact = artifacts.require('DistributionUniPrincipal');

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('SaffronPool', function (accounts) {

  let network = 'development'

  let alice = accounts[0];
  let bob = accounts[1];
  let charlie = accounts[2];
  let danny = accounts[3];
  let snapshotIdTest;
  let snapshotIdPrimary;

  let contracts = {};
  let distribution_contracts = [];

  console.log(assets);
  console.log(assets[network]);
  before(async function () {
    // prevent Compound from throwing "re-entered" exceptions
    // by requesting the current exchange rate before snapshot
    let cDai = await ICErc20.at(assets[network]["cDAI"]);

    snapshotIdPrimary = (await gtt.takeSnapshot())["result"];
    contracts.base_asset = await DAI.at(assets[network]["DAI"]);

    contracts.dsec_token_S = await dsec_S.at(assets[network]["dsec_S"]);
    contracts.dsec_token_A = await dsec_A.at(assets[network]["dsec_A"]);
    contracts.principal_token_S = await principal_S.at(assets[network]["principal_S"]);
    contracts.principal_token_A = await principal_A.at(assets[network]["principal_A"]);

    contracts.dsec_token_uniswap = await principal_uniswap.at(assets[network]["dsec_UNI"]);
    contracts.principal_token_uniswap = await dsec_uniswap.at(assets[network]["principal_UNI"]);

    contracts.distributionSInterest = await distributionSInterestArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionSInterest.address));
    console.log("distributionSInterest: ", distribution_contracts[0].address);

    contracts.distributionAInterest = await distributionAInterestArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionAInterest.address));
    console.log("distributionAInterest: ", distribution_contracts[1].address);

    contracts.distributionSPrincipal = await distributionSPrincipalArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionSPrincipal.address));
    console.log("distributionSPrincipal: ", distribution_contracts[2].address);

    contracts.distributionAPrincipal = await distributionAPrincipalArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionAPrincipal.address));
    console.log("distributionAPrincipal: ", distribution_contracts[3].address);

    contracts.distributionUniSFI = await distributionUniSFIArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionUniSFI.address));
    console.log("distributionUniSFI: ", distribution_contracts[4].address);

    contracts.distributionUniPrincipal = await distributionUniPrincipalArtifact.new();
    distribution_contracts.push(await distributionBase.at(contracts.distributionUniPrincipal.address));
    console.log("distributionUniPrincipal: ", distribution_contracts[5].address);

    contracts.fundRescue = await fundRescueArtifact.new(contracts.distributionSInterest.address, contracts.distributionAInterest.address, contracts.distributionSPrincipal.address, contracts.distributionAPrincipal.address, contracts.distributionUniSFI.address, contracts.distributionUniPrincipal.address);

    contracts.distributionSInterest.setFundRescue(contracts.fundRescue.address);
    contracts.distributionSPrincipal.setFundRescue(contracts.fundRescue.address);
    contracts.distributionAInterest.setFundRescue(contracts.fundRescue.address);
    contracts.distributionAPrincipal.setFundRescue(contracts.fundRescue.address);
    contracts.distributionUniSFI.setFundRescue(contracts.fundRescue.address);
    contracts.distributionUniPrincipal.setFundRescue(contracts.fundRescue.address);

  });

  beforeEach(async function () {
    snapshotIdTest = (await gtt.takeSnapshot())["result"];
    console.log(`----- BEGIN ${this.currentTest.fullTitle()} -----`)
  });

  afterEach(async function () {
    console.log(`----- END ${this.currentTest.fullTitle()} -----`)
    //await gtt.revertToSnapshot(snapshotIdTest);
  });

  after(async function () {
    //await gtt.revertToSnapshot(snapshotIdPrimary);
  });

  it('test getters', async function () {
    let governance = alice;
    let fund_rescue = await distribution_contracts[1].fund_rescue();
    console.log(fund_rescue);
    /*
    for (let i = 0; i < distribution_contracts.length; i++) {
      let fund_rescue = await distribution_contracts[i].fund_rescue.call();
      assert(governance == fund_rescue.toString(), "governance mismatch on distribution contract");
      console.log(fund_rescue);
    }
    */
  });
  
});

