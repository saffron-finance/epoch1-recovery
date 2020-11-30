const {expectRevert, time, constants, BN} = require('@openzeppelin/test-helpers');
const gtt = require('ganache-time-traveler');

// Address Book
const assets = require('../address_book.js');

// Library contracts
const ERC20 = artifacts.require('ERC20');

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
const fundRescueArtifact = artifacts.require('FundRescue');
const distributionSInterestArtifact = artifacts.require('DistributionSInterest');
const distributionSPrincipalArtifact = artifacts.require('DistributionSPrincipal');
const distributionAInterestArtifact = artifacts.require('DistributionAInterest');
const distributionAPrincipalArtifact = artifacts.require('DistributionAPrincipal');
const distributionUniSFIArtifact = artifacts.require('DistributionUniSFI');
const distributionUniPrincipalArtifact = artifacts.require('DistributionUniPrincipal');

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('SaffronPool', function (accounts, network) {

  let alice = accounts[0];
  let bob = accounts[1];
  let charlie = accounts[2];
  let danny = accounts[3];
  let snapshotIdTest;
  let snapshotIdPrimary;

  let contracts = {};

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

    contracts.fundRescue = await fundRescueArtifact.New();
    contracts.distributionSInterest = await distributionSInterestArtifact.New();
    contracts.distributionSPrincipal = await distributionSPrincipalArtifact.New();
    contracts.distributionAInterest = await distributionAInterestArtifact.New();
    contracts.distributionAPrincipal = await distributionAPrincipalArtifact.New();
    contracts.distributionUniSFI = await distributionUniSFIArtifact.New();
    contracts.distributionUniPrincipal = await distributionUniPrincipalArtifact.New();
  });

  beforeEach(async function () {
    snapshotIdTest = (await gtt.takeSnapshot())["result"];
    console.log(`----- BEGIN ${this.currentTest.fullTitle()} -----`)
  });

  afterEach(async function () {
    console.log(`----- END ${this.currentTest.fullTitle()} -----`)
    await gtt.revertToSnapshot(snapshotIdTest);
  });

  after(async function () {
    await gtt.revertToSnapshot(snapshotIdPrimary);
  });

  async function hourly_strategy(user = alice) {
  }

  it('test getters', async function () {
    await get_epoch_cycle_params();
    await get_base_asset_address();
  });
});

