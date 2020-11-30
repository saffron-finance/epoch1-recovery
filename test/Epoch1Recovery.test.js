const {expectRevert, time, constants, BN} = require('@openzeppelin/test-helpers');
const gtt = require('ganache-time-traveler');
const SimDAI = artifacts.require('MintableToken');

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
const DAI_MCD_JOIN = '0x9759A6Ac90977b93B58547b4A71c78317f391A28';

contract('Epoch1Recovery Test', function (accounts) {

  let network = 'development'

  let governance = assets[network]["TEAM"];
  let alice = accounts[0];
  let bob = accounts[1];
  let charlie = accounts[2];
  let danny = accounts[3];
  let snapshotIdTest;
  let snapshotIdPrimary;

  let contracts = {};
  let saffron = {};
  let evm = {};
  let sim = {};

  before(async function () {
    // prevent Compound from throwing "re-entered" exceptions
    // by requesting the current exchange rate before snapshot
    sim.DAI = await SimDAI.at(assets[network]["DAI"]);

    evm.cDai = await ICErc20.at(assets[network]["cDAI"]);
    await evm.cDai.exchangeRateCurrent();
    evm.ERC20cDAI = await ERC20.at(assets[network]["cDAI"]);
    saffron.daiCompoundAdapter = await DAI_Compound_Adapter.at(assets[network]["DAI_Compound_Adapter"]);

    snapshotIdPrimary = (await gtt.takeSnapshot())["result"];
    evm.DAI = await DAI.at(assets[network]["DAI"]);

    contracts.dsec_token_S = await dsec_S.at(assets[network]["dsec_S"]);
    contracts.dsec_token_A = await dsec_A.at(assets[network]["dsec_A"]);
    contracts.principal_token_S = await principal_S.at(assets[network]["principal_S"]);
    contracts.principal_token_A = await principal_A.at(assets[network]["principal_A"]);

    contracts.dsec_token_uniswap = await principal_uniswap.at(assets[network]["dsec_UNI"]);
    contracts.principal_token_uniswap = await dsec_uniswap.at(assets[network]["principal_UNI"]);

    contracts.distributionSInterest = await distributionSInterestArtifact.new({from: alice});
    contracts.distributionAInterest = await distributionAInterestArtifact.new({from: alice});
    contracts.distributionSPrincipal = await distributionSPrincipalArtifact.new({from: alice});
    contracts.distributionAPrincipal = await distributionAPrincipalArtifact.new({from: alice});
    contracts.distributionUniSFI = await distributionUniSFIArtifact.new({from: alice});
    contracts.distributionUniPrincipal = await distributionUniPrincipalArtifact.new({from: alice});

    contracts.fundRescue = await fundRescueArtifact.new(contracts.distributionSInterest.address, contracts.distributionAInterest.address, contracts.distributionSPrincipal.address, contracts.distributionAPrincipal.address, contracts.distributionUniSFI.address, contracts.distributionUniPrincipal.address, {from: alice});

    //let get_governance_test = await contracts.distributionSInterest.governance();
    await contracts.distributionSInterest.setFundRescue(contracts.fundRescue.address, {from: alice});
    await contracts.distributionAInterest.setFundRescue(contracts.fundRescue.address, {from: alice});
    await contracts.distributionSPrincipal.setFundRescue(contracts.fundRescue.address, {from: alice});
    await contracts.distributionSPrincipal.setFundRescue(contracts.fundRescue.address, {from: alice});
    await contracts.distributionUniSFI.setFundRescue(contracts.fundRescue.address, {from: alice});
    await contracts.distributionUniPrincipal.setFundRescue(contracts.fundRescue.address, {from: alice});

  });

  beforeEach(async function () {
    console.log(`----- BEGIN ${this.currentTest.fullTitle()} -----`)
    snapshotIdTest = (await gtt.takeSnapshot())["result"];
  });

  afterEach(async function () {
    console.log(`----- END ${this.currentTest.fullTitle()} -----`)
    await gtt.revertToSnapshot(snapshotIdTest);
  });

  after(async function () {
    await gtt.revertToSnapshot(snapshotIdPrimary);
  });


  it('test dai rescue', async function () {
    // Approve transfer
    let adapter_cdai_balance_before = await evm.cDai.balanceOf.call(saffron.daiCompoundAdapter.address);

    // Set base asset on adapter to cDAI
    await saffron.daiCompoundAdapter.set_base_asset(assets[network]["cDAI"], {from: governance});

    let zero = web3.utils.toBN(0);
    // Approve transfer from adapter to governance
    await saffron.daiCompoundAdapter.approve_transfer(governance, adapter_cdai_balance_before, {from: governance});

    // Transfer cDAI to governance
    await evm.ERC20cDAI.transferFrom(saffron.daiCompoundAdapter.address, governance, adapter_cdai_balance_before, {from: governance});
    let my_balance = await evm.cDai.balanceOf.call(governance);
    console.log("governance cDAI balance is now ", my_balance.toString());
    let adapter_cdai_balance_after = await evm.cDai.balanceOf.call(saffron.daiCompoundAdapter.address);
    console.log("adapter balance before, adapter balance after:", adapter_cdai_balance_before.toString(), adapter_cdai_balance_after.toString());

    // Transfer small amount from governance to fundRescue
    //await evm.ERC20cDAI.transfer(contracts.fundRescue.address, my_balance, {from: governance}); 
    //let my_balance2 = my_balance.div(1000);

    await evm.ERC20cDAI.transfer(contracts.fundRescue.address, my_balance.div(web3.utils.toBN(1000)), {from: governance}); 

    let fundRescue_bal = await evm.cDai.balanceOf.call(contracts.fundRescue.address);
    let fundRescue_gov = await contracts.fundRescue.governance();
    console.log("FundRescue contract governance:", fundRescue_gov.toString());
    console.log("FundRescue cDAI balance:", fundRescue_bal.toString());
    console.log("calling fundRescue.daiRescue()...");

    await expectRevert(
      contracts.fundRescue.redeemDai.call({from: alice}),
      'revert'
    );


    let S_INTEREST_EARNED = web3.utils.toBN("38577996099131004531621");
    let S_PRINCIPAL_AMOUNT = web3.utils.toBN("51029966983206580100000000");
    let A_INTEREST_EARNED = web3.utils.toBN("47795853357341105935610");
    let A_PRINCIPAL_AMOUNT = web3.utils.toBN("4239020891056530000000000");
    let total_amount_dai = S_INTEREST_EARNED.add(S_PRINCIPAL_AMOUNT).add(A_INTEREST_EARNED).add(A_PRINCIPAL_AMOUNT);

    // Mint test DAI
    await sim.DAI.mint(governance, total_amount_dai, {from: DAI_MCD_JOIN, gasPrice: web3.utils.toHex(0)});

    let sim_dai_gov_bal = await evm.DAI.balanceOf.call(governance);
    assert(sim_dai_gov_bal.gt(total_amount_dai));

    console.log(sim_dai_gov_bal.toString() + " DAI minted to governance");

    await sim.DAI.transfer(contracts.fundRescue.address, total_amount_dai, {from: governance}); 
    
    fundRescue_bal = await evm.DAI.balanceOf.call(contracts.fundRescue.address);
    console.log("FundRescue contract governance:", fundRescue_bal.toString());
    //let rescue_contract_dai_balance = await evm.DAI.balanceOf.call(contract.fundRescue);
    //console.log("rescue DAI balance: ", rescue_contract_dai_balance);

    /*
    await saffron.daiCompoundAdapter.approve_transfer(contracts.fundRescue.address, zero, {from: governance});
    await saffron.daiCompoundAdapter.approve_transfer(governance, cdaiamt, {from: governance});
    await evm.ERC20cDAI.transferFrom(saffron.daiCompoundAdapter.address, governance, cdaiamt, {from: governance});
    let my_balance = await evm.cDai.balanceOf.call(governance);
    console.log(my_balance.toString());
    /*
    let adapter_cdai_balance_after = await evm.cDai.balanceOf.call(saffron.daiCompoundAdapter.address);
    console.log("before, response, after:", adapter_cdai_balance_before, response, adapter_cdai_balance_after);
    */
  });
});

