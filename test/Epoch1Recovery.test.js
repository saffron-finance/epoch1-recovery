const {expectRevert, time, constants, BN} = require('@openzeppelin/test-helpers');
const gtt = require('ganache-time-traveler');

// Address Book
const assets = require('../address_book.js');

// Library contracts
const ERC20 = artifacts.require('ERC20');

// Saffron
const SaffronPool = artifacts.require('ISaffronPool');
const DAI_Compound_Adapter = artifacts.require('ISaffronAdapter');
const SaffronUniswapLPPool = artifacts.require('ISaffronPool');

const dsec_S = artifacts.require('SaffronLPBalanceToken');
const principal_S = artifacts.require('SaffronLPBalanceToken');
const dsec_A = artifacts.require('SaffronLPBalanceToken');
const principal_A = artifacts.require('SaffronLPBalanceToken');

const dsec_uniswap = artifacts.require('SaffronLPBalanceToken');
const principal_uniswap = artifacts.require('SaffronLPBalanceToken');

// Epoch 1 Recovery
const epoch_recovery = artifacts.require('Epoch1Recovery');

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('SaffronPool', function (accounts) {

  let network = 'development';
  let alice = accounts[0];
  let bob = accounts[1];
  let charlie = accounts[2];
  let danny = accounts[3];
  let snapshotIdTest;
  let snapshotIdPrimary;

  let coreContracts = {};

  before(async function () {
    // prevent Compound from throwing "re-entered" exceptions
    // by requesting the current exchange rate before snapshot
    let cDai = await ICErc20.at(assets["development"]["cDAI"]);

    snapshotIdPrimary = (await gtt.takeSnapshot())["result"];
    coreContracts.base_asset = await DAI.at(assets["development"]["DAI"]);

    coreContracts.dsec_token_S = await dsec_S.at(assets["development"]["dsec_S"]);
    coreContracts.dsec_token_A = await dsec_A.at(assets["development"]["dsec_A"]);
    coreContracts.principal_token_S = await principal_S.at(assets["development"]["principal_S"]);
    coreContracts.principal_token_A = await principal_A.at(assets["development"]["principal_A"]);

    coreContracts.dsec_token_uniswap = await principal_uniswap.at(assets["development"]["dsec_UNI"]);
    coreContracts.principal_token_uniswap = await dsec_uniswap.at(assets["development"]["principal_UNI"]);

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

