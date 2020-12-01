const {expectRevert, time, constants, BN} = require('@openzeppelin/test-helpers');
const gtt = require('ganache-time-traveler');
const SimDAI = artifacts.require('MintableToken');

// Address Book
const assets = require('../address_book.js');

// Snapshots
const snapshot_dai = require('../snapshot/D869AEE9-dsec-address-amount.json');
const snapshot_uni = require('../snapshot/6B366aa3-dsec-address-amount.json');
const snapshot_addrs = require('../snapshot/all_lp_addresses.json');
const snapshot_full = require('../snapshot/saffron-epoch1-LPs-2020-12-01T12:03:55-0500.json');

// Library contracts
const ERC20 = artifacts.require('ERC20');
const ICErc20 = artifacts.require('ICErc20');
const DAI = artifacts.require('ERC20');

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
const distributionBase = artifacts.require('DistributionBase');
const fundRescueArtifact = artifacts.require('FundRescue');
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


contract('Epoch1Recovery Test', function (accounts) {

  let network = 'development'

  let governance = assets[network]["TEAM"];

  let contracts = {};
  let saffron = {};
  let evm = {};
  let sim = {};

  before(async function () {
    console.log("=== INITIALIZATION ===");
    if (network.startsWith('development')) {
      // Simulated ERC20s for devnet
      sim.DAI = await SimDAI.at(assets[network]["DAI"]);
    }

    // Saffron specific contracts
    saffron.daiCompoundAdapter = await DAI_Compound_Adapter.at(assets[network]["DAI_Compound_Adapter"]);
    saffron.UniPool = await SaffronUniswapLPPool.at(assets[network]["SaffronERC20StakingPool_Uniswap_SFI/ETH"]);
    saffron.SFI = await ERC20.at(assets[network]["SFI"]);
    console.log("EVM state loaded:\n  " + saffron.daiCompoundAdapter.address + " Saffron DAI/Compound Adapter\n  " + saffron.UniPool.address + " Saffron Uniswap SFI/ETH Pool\n  " + saffron.SFI.address + " Saffron SFI Token");

    // Non-Saffron contracts that live on the evm
    evm.UNIV2 = await ERC20.at(assets[network]["SFI/ETH UniV2"]);
    evm.DAI = await DAI.at(assets[network]["DAI"]);
    evm.cDai = await ICErc20.at(assets[network]["cDAI"]);
    evm.ERC20cDAI = await ERC20.at(assets[network]["cDAI"]);
    console.log("EVM state loaded:\n  " + evm.UNIV2.address + " SFI/ETH UNIV2 LP Token\n  " + evm.DAI.address + " ERC20 DAI\n  " + evm.cDai.address + " ICErc20 cDAI\n  " + evm.ERC20cDAI.address + " ERC20 cDAI");

    if (network.startsWith('development')) {
      // prevent Compound from throwing "re-entered" exceptions
      // by requesting the current exchange rate before snapshot
      await evm.cDai.exchangeRateCurrent();
    }

    // Existing dsec and principal tokens
    // TODO: Do we need to set these addresses in the Distribution* contracts when they're deployed?
    saffron.dsec_token_S = await dsec_S.at(assets[network]["dsec_S"]);
    saffron.principal_token_S = await principal_S.at(assets[network]["principal_S"]);
    saffron.dsec_token_A = await dsec_A.at(assets[network]["dsec_A"]);
    saffron.principal_token_A = await principal_A.at(assets[network]["principal_A"]);
    saffron.dsec_token_uniswap = await principal_uniswap.at(assets[network]["dsec_UNI"]);
    saffron.principal_token_uniswap = await dsec_uniswap.at(assets[network]["principal_UNI"]);
    console.log("EVM state loaded:\n  " + saffron.dsec_token_S.address + " S dsec\n  " + saffron.principal_token_S.address + " S principal\n  " + saffron.dsec_token_A.address + " A dsec\n  " + saffron.principal_token_A.address + " A principal\n  " + saffron.dsec_token_uniswap.address + " Uni dsec\n  " + saffron.principal_token_uniswap.address + " Uni principal");

    // Deploy Distribution* contracts
    contracts.distributionSInterest = await distributionSInterestArtifact.new({from: governance});
    contracts.distributionSPrincipal = await distributionSPrincipalArtifact.new({from: governance});
    contracts.distributionAInterest = await distributionAInterestArtifact.new({from: governance});
    contracts.distributionAPrincipal = await distributionAPrincipalArtifact.new({from: governance});
    contracts.distributionUniSFI = await distributionUniSFIArtifact.new({from: governance});
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
    assert((await contracts.distributionSInterest.lp_token_address()).toString() === "0x372Bc201134676c846F1fd07a2a059Fd18526De3", "distributionSInterest.lp_token_address() does not match expected value");
    assert((await contracts.distributionSPrincipal.lp_token_address()).toString() === "0x9be973b1496E28b3b745742391B0E5977184f1AC", "distributionSPrincipal.lp_token_address() does not match expected value");
    assert((await contracts.distributionAInterest.lp_token_address()).toString() === "0x28DcafcbF29A502B33a719d726B0E723A73b6AD3", "distributionAInterest.lp_token_address() does not match expected value");
    assert((await contracts.distributionAPrincipal.lp_token_address()).toString() === "0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5", "distributionAPrincipal.lp_token_address() does not match expected value");
    assert((await contracts.distributionUniSFI.lp_token_address()).toString() === "0x19e5a60c1646c921aC592409548d1bCe5B071Faa", "distributionUniSFI.lp_token_address() does not match expected value");
    assert((await contracts.distributionUniPrincipal.lp_token_address()).toString() === "0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d", "distributionUniPrincipal.lp_token_address() does not match expected value");

    // Deploy FundRescue contract 
    contracts.fundRescue = await fundRescueArtifact.new(contracts.distributionSInterest.address, contracts.distributionSPrincipal.address, contracts.distributionAInterest.address, contracts.distributionAPrincipal.address, contracts.distributionUniSFI.address, contracts.distributionUniPrincipal.address, {from: governance});

    // Verify FundRescue contract has the correct values for each Distribution* contract
    console.log("FundRescue contract deployed:\n  " + contracts.fundRescue.address + " FundRescue contract");
    console.log("FundRescue contract deployed with LP token values:\n  " +
      (await contracts.fundRescue.distribution_contract_s_dsec()).toString() + " s_dsec\n  " +
      (await contracts.fundRescue.distribution_contract_s_principal()).toString() + " s_principal\n  " +
      (await contracts.fundRescue.distribution_contract_a_dsec()).toString() + " a_dsec\n  " +
      (await contracts.fundRescue.distribution_contract_a_principal()).toString() + " a_principal\n  " +
      (await contracts.fundRescue.distribution_contract_uni_sfi()).toString() + " uni_sfi\n  " +
      (await contracts.fundRescue.distribution_contract_uni_principal()).toString() + " uni_principal");
    assert((await contracts.fundRescue.distribution_contract_s_dsec()).toString() === contracts.distributionSInterest.address, "ERROR: distribution contract address mismatch in FundRescue");
    assert((await contracts.fundRescue.distribution_contract_s_principal()).toString() === contracts.distributionSPrincipal.address, "ERROR: distribution contract address mismatch in FundRescue");
    assert((await contracts.fundRescue.distribution_contract_a_dsec()).toString() === contracts.distributionAInterest.address, "ERROR: distribution contract address mismatch in FundRescue");
    assert((await contracts.fundRescue.distribution_contract_a_principal()).toString() === contracts.distributionAPrincipal.address, "ERROR: distribution contract address mismatch in FundRescue");
    assert((await contracts.fundRescue.distribution_contract_uni_sfi()).toString() === contracts.distributionUniSFI.address, "ERROR: distribution contract address mismatch in FundRescue");
    assert((await contracts.fundRescue.distribution_contract_uni_principal()).toString() === contracts.distributionUniPrincipal.address, "ERROR: distribution contract address mismatch in FundRescue");

    // Set governance on FundRescue contract
    await contracts.distributionSInterest.setFundRescue(contracts.fundRescue.address, {from: governance});
    await contracts.distributionSPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance});
    await contracts.distributionAInterest.setFundRescue(contracts.fundRescue.address, {from: governance});
    await contracts.distributionAPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance});
    await contracts.distributionUniSFI.setFundRescue(contracts.fundRescue.address, {from: governance});
    await contracts.distributionUniPrincipal.setFundRescue(contracts.fundRescue.address, {from: governance});

    console.log("Distribution* contracts deployed with FundRescue contract address set:\n  " +
      (await contracts.distributionSInterest.fund_rescue()).toString() + " distributionSInterest\n  " +
      (await contracts.distributionSPrincipal.fund_rescue()).toString() + " distributionSPrincipal\n  " +
      (await contracts.distributionAInterest.fund_rescue()).toString() + " distributionAInterest\n  " +
      (await contracts.distributionAPrincipal.fund_rescue()).toString() + " distributionAPrincipal\n  " +
      (await contracts.distributionUniSFI.fund_rescue()).toString() + " distributionUniSFI\n  " +
      (await contracts.distributionUniPrincipal.fund_rescue()).toString() + " distributionUniPrincipal");
    assert((await contracts.distributionSInterest.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionSInterest fund_rescue address does not match FundRescue contract address");
    assert((await contracts.distributionSPrincipal.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionSPrincipal fund_rescue address does not match FundRescue contract address");
    assert((await contracts.distributionAInterest.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionAInterest fund_rescue address does not match FundRescue contract address");
    assert((await contracts.distributionAPrincipal.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionAPrincipal fund_rescue address does not match FundRescue contract address");
    assert((await contracts.distributionUniSFI.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionUniSFI fund_rescue address does not match FundRescue contract address");
    assert((await contracts.distributionUniPrincipal.fund_rescue()).toString() === contracts.fundRescue.address, "ERROR: distributionUniPrincipal fund_rescue address does not match FundRescue contract address");

  });

  async function rescueDai() {
    console.log("Execute cDAI sweep from Saffron Epoch 1 DAI/Compound adapter:");
    let adapter_cdai_balance_before = await evm.cDai.balanceOf.call(saffron.daiCompoundAdapter.address);

    // Set base asset on adapter to cDAI
    await saffron.daiCompoundAdapter.set_base_asset(assets[network]["cDAI"], {from: governance});

    // Approve transfer from adapter to governance
    await saffron.daiCompoundAdapter.approve_transfer(governance, adapter_cdai_balance_before, {from: governance});
    console.log("  1. DAI/Compound Adapter approve_transfer complete");

    // Transfer cDAI to governance
    await evm.ERC20cDAI.transferFrom(saffron.daiCompoundAdapter.address, governance, adapter_cdai_balance_before, {from: governance});
    let gov_balance = await evm.cDai.balanceOf.call(governance);
    console.log("  2. Transferred cDAI to governance, governance cDAI balance is now", gov_balance.toString());
    console.log(ADAPTER_CDAI_BAL.toString())
    assert(gov_balance.gte(ADAPTER_CDAI_BAL), "Governance cDAI balance is too low after transferFrom");

    let adapter_cdai_balance_after = await evm.cDai.balanceOf.call(saffron.daiCompoundAdapter.address);
    console.log("  3. Verified transfer of non-zero value out of adapter: adapter balance before, adapter balance after:", adapter_cdai_balance_before.toString(), adapter_cdai_balance_after.toString());
    assert(adapter_cdai_balance_before.gt(adapter_cdai_balance_after), "ERROR: Adapter balance was not reduced after transferFrom");

    let fundRescue_bal_before = await evm.cDai.balanceOf(contracts.fundRescue.address);
    await evm.ERC20cDAI.transfer(contracts.fundRescue.address, gov_balance, {from: governance});
    let fundRescue_bal_after = await evm.cDai.balanceOf.call(contracts.fundRescue.address);
    let fundRescue_gov = await contracts.fundRescue.governance();
    console.log("  4. cDAI transferred to FundRescue contract, cDAI balance after transfer:", fundRescue_bal_after.toString());
    console.log("  5. FundRescue contract governance set:", fundRescue_gov.toString());
    assert(fundRescue_gov.toString() === governance, "ERROR: FundRescue contract governance does not match expected value");
    assert(fundRescue_bal_after.eq(fundRescue_bal_before.add(gov_balance)), "ERROR: FundRescue contract governance does not match expected value");

    if (network.startsWith('development')) {
      // Call redeemDai to change cDAI to DAI
      await expectRevert(contracts.fundRescue.redeemDai.call({from: governance}), 'revert');
      // Mint test DAI
      await sim.DAI.mint(governance, DAI_TOTAL, {from: DAI_MCD_JOIN, gasPrice: web3.utils.toHex(0)});

      // Get governance DAI balance
      let dai_gov_bal = await evm.DAI.balanceOf.call(governance);
      console.log("  6. [Development] DAI mint: " + DAI_TOTAL.toString() + " DAI minted to governance");
      assert(dai_gov_bal.gt(DAI_TOTAL));
      // Send DAI to FundRescue
      await sim.DAI.transfer(contracts.fundRescue.address, DAI_TOTAL, {from: governance});
    } else {
      // Call redeemDai to change cDAI to DAI
      await contracts.fundRescue.redeemDai.call({from: governance});
      console.log("  6. Executed redeemDai to swap cDAI for DAI in FundRescue contract via Compound ICErc20's redeem() function");
    }

    // Ensure FundRescue contract has the correct amount of real DAI
    let fundRescue_bal = await evm.DAI.balanceOf.call(contracts.fundRescue.address);
    console.log("  7. Verified FundRescue contract has enough DAI to cover the " + DAI_TOTAL.toString() + " DAI needed for recovery. FundRescue DAI balance:", fundRescue_bal.toString());
    assert(fundRescue_bal.gte(DAI_TOTAL));

    console.log("Execute SFI & UNIV2 sweep from Saffron Epoch 1 Uniswap LP Pool:");

    // Set base asset address on UniPool with governance so we can sweep
    await saffron.UniPool.set_base_asset_address(governance, {from: governance});
    console.log("  1. Pool base_asset_address was set to something other than SFI/ETH UNIV2 token address.");
    assert((await saffron.UniPool.base_asset_address()).toString() === governance, "ERROR: UniPool.base_asset_address() does not match expected value");

    // Sweep SFI tokens from pool
    await saffron.UniPool.erc_sweep(saffron.SFI.address, contracts.fundRescue.address, {from: governance});
    console.log("  2. Pool's SFI tokens swept into the FundRescue contract.");
    assert((await saffron.SFI.balanceOf(contracts.fundRescue.address)).gte(UNI_SFI_EARNED));

    // Sweep SFI/ETH UNIV2 tokens from pool
    let UNIV2_EXPECTED = web3.utils.toBN("4217195425373693533612");
    await saffron.UniPool.erc_sweep(evm.UNIV2.address, contracts.fundRescue.address, {from: governance});
    console.log("  3. Pool's UNIV2 tokens swept into the FundRescue contract.");
    assert((await evm.UNIV2.balanceOf(contracts.fundRescue.address)).gte(UNIV2_EXPECTED));

    // FundRescue contract: approve and transfer funds to distribution contracts
    await contracts.fundRescue.approveAndTransferFundsToDistributionContracts({from: governance});
    console.log("  4. FundRescue approveAndTransferFundsToDistributionContracts() executed:\n  " +
      "  DistributionSInterest has " + (await evm.DAI.balanceOf.call(contracts.distributionSInterest.address)).toString() + " DAI (" + S_INTEREST_EARNED + " expected)\n  " +
      "  DistributionSPrincipal has " + (await evm.DAI.balanceOf.call(contracts.distributionSPrincipal.address)).toString() + " DAI (" + S_PRINCIPAL_AMOUNT + " expected)\n  " +
      "  DistributionAInterest has " + (await evm.DAI.balanceOf.call(contracts.distributionAInterest.address)).toString() + " DAI (" + A_INTEREST_EARNED + " expected)\n  " +
      "  DistributionAPrincipal has " + (await evm.DAI.balanceOf.call(contracts.distributionAPrincipal.address)).toString() + " DAI (" + A_PRINCIPAL_AMOUNT + " expected)\n  " +
      "  DistributionUniSFI has " + (await saffron.SFI.balanceOf.call(contracts.distributionUniSFI.address)).toString() + " DAI (" + UNI_SFI_EARNED + " expected )\n  " +
      "  DistributionUniPrincipal has " + (await evm.UNIV2.balanceOf.call(contracts.distributionUniPrincipal.address)).toString() + " DAI (" + UNI_PRINCIPAL_AMOUNT + " expected)");
    assert((await evm.DAI.balanceOf.call(contracts.distributionSInterest.address)).gte(S_INTEREST_EARNED), "DistributionSInterest balanceOf is too low");
    assert((await evm.DAI.balanceOf.call(contracts.distributionSPrincipal.address)).gte(S_PRINCIPAL_AMOUNT), "DistributionSPrincipal balanceOf is too low");
    assert((await evm.DAI.balanceOf.call(contracts.distributionAInterest.address)).gte(A_INTEREST_EARNED), "DistributionAInterest balanceOf is too low");
    assert((await evm.DAI.balanceOf.call(contracts.distributionAPrincipal.address)).gte(A_PRINCIPAL_AMOUNT), "DistributionAPrincipal balanceOf is too low");
    assert((await saffron.SFI.balanceOf.call(contracts.distributionUniSFI.address)).gte(UNI_SFI_EARNED), "DistributionUniSFI balanceOf is too low");
    assert((await evm.UNIV2.balanceOf.call(contracts.distributionUniPrincipal.address)).gte(UNI_PRINCIPAL_AMOUNT), "DistributionUniPrincipal balanceOf is too low");
  }

  async function testUserRedeem() {
    // Allow redemptions on Distribution* contracts
    await contracts.distributionSInterest.allowRedeem({from: governance});
    await contracts.distributionSPrincipal.allowRedeem({from: governance});
    await contracts.distributionAInterest.allowRedeem({from: governance});
    await contracts.distributionAPrincipal.allowRedeem({from: governance});
    await contracts.distributionUniSFI.allowRedeem({from: governance});
    await contracts.distributionUniPrincipal.allowRedeem({from: governance});

    let userHoldings = {}
    let count = 0;
    let aggregate_s_dsec = ZERO_BN;
    let aggregate_s_principal = ZERO_BN;
    let aggregate_a_dsec = ZERO_BN;
    let aggregate_a_principal = ZERO_BN;
    let aggregate_uni_dsec = ZERO_BN;
    let aggregate_uni_principal = ZERO_BN;

    // Iterate through json file of snapshot to get all user addresses as of 2020-12-01
    for (const addLog of snapshot_full) {
      let user = {
        address: addLog[0],
        s_dsec: web3.utils.toBN(addLog[1]),
        s_principal: web3.utils.toBN(addLog[2]),
        a_dsec: web3.utils.toBN(addLog[3]),
        a_principal: web3.utils.toBN(addLog[4]),
        uni_dsec: web3.utils.toBN(addLog[5]),
        uni_principal: web3.utils.toBN(addLog[6]),
      };
      userHoldings[addLog[0]] = user;
      aggregate_s_dsec = aggregate_s_dsec.add(user.s_dsec);
      aggregate_s_principal = aggregate_s_principal.add(user.s_principal);
      aggregate_a_dsec = aggregate_a_dsec.add(user.a_dsec);
      aggregate_a_principal = aggregate_a_principal.add(user.a_principal);
      aggregate_uni_dsec = aggregate_uni_dsec.add(user.uni_dsec);
      aggregate_uni_principal = aggregate_uni_principal.add(user.uni_principal);
      count++;
      //console.log(count.toString() + " " + addLog + " " + user.s_dsec.toString() + " " + user.s_principal.toString() + " " + user.a_dsec.toString() + " " + user.a_principal.toString() + " " + user.uni_dsec.toString() + " " + user.uni_principal.toString());
    }
    console.log("Processed " + count.toString() + " users from log");
    console.log("  aggregate_s_dsec: " + aggregate_s_dsec.toString());
    console.log("  aggregate_s_principal: " + aggregate_s_principal.toString());
    console.log("  aggregate_a_dsec: " + aggregate_a_dsec.toString());
    console.log("  aggregate_a_principal: " + aggregate_a_principal.toString());
    console.log("  aggregate_uni_dsec: " + aggregate_uni_dsec.toString());
    console.log("  aggregate_uni_principal: " + aggregate_uni_principal.toString());

    count = 0;
    let aggregate_DAI_redeemed = ZERO_BN;
    let aggregate_SFI_redeemed = ZERO_BN;
    let aggregate_UNI_redeemed = ZERO_BN;
    for (const key in userHoldings) {
      let user = userHoldings[key];
      let dai_before = await evm.DAI.balanceOf.call(user.address);
      let dai_s_principal_redeemed = ZERO_BN;
      let dai_a_principal_redeemed = ZERO_BN;
      let dai_s_interest_redeemed = ZERO_BN;
      let dai_a_interest_redeemed = ZERO_BN;

      // check if address is unlocked
      try {
        let txSend = await web3.eth.sendTransaction({
          from: user.address,
          to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
          value: ZERO_BN,
          gasPrice: ZERO_BN
        });
      } catch (e) {
        if (e.message === "Returned error: sender account not recognized")
          // address is locked
          continue;
        throw e;
      }

      console.log(`Redeeming on behalf of user #${count}  ${user.address} -- user has ${dai_before} DAI in their wallet now:`);

      // Redeem S principal
      let user_s_principal_tokens_before = await saffron.principal_token_S.balanceOf(user.address);
      if (user_s_principal_tokens_before.gt(ZERO_BN)) {
        await saffron.principal_token_S.approve(contracts.distributionSPrincipal.address, user_s_principal_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionSPrincipal.redeem({from: user.address, gasPrice: ZERO_BN});
      }
      dai_s_principal_redeemed = (await evm.DAI.balanceOf.call(user.address)).sub(dai_before);

      // Redeem A principal
      let user_a_principal_tokens_before = await saffron.principal_token_A.balanceOf(user.address);
      if (user_a_principal_tokens_before.gt(ZERO_BN)) {
        await saffron.principal_token_A.approve(contracts.distributionAPrincipal.address, user_a_principal_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionAPrincipal.redeem( {from: user.address, gasPrice:ZERO_BN});
      }
      dai_a_principal_redeemed = (await evm.DAI.balanceOf.call(user.address)).sub(dai_s_principal_redeemed).sub(dai_before);

      // Redeem S dsec
      let user_s_dsec_tokens_before = await saffron.dsec_token_S.balanceOf(user.address);
      if (user_s_dsec_tokens_before.gt(ZERO_BN)) {
        await saffron.dsec_token_S.approve(contracts.distributionSInterest.address, user_s_dsec_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionSInterest.redeem( {from: user.address, gasPrice: ZERO_BN});
      }
      dai_s_interest_redeemed = (await evm.DAI.balanceOf.call(user.address)).sub(dai_s_principal_redeemed).sub(dai_a_principal_redeemed).sub(dai_before);

      // Redeem A dsec
      let user_a_dsec_tokens_before = await saffron.dsec_token_A.balanceOf(user.address);
      if (user_a_dsec_tokens_before.gt(ZERO_BN)) {
        await saffron.dsec_token_A.approve(contracts.distributionAInterest.address, user_a_dsec_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionAInterest.redeem({from: user.address, gasPrice:ZERO_BN});
      }
      dai_a_interest_redeemed = (await evm.DAI.balanceOf.call(user.address)).sub(dai_s_principal_redeemed).sub(dai_a_principal_redeemed).sub(dai_s_interest_redeemed).sub(dai_before);

      let dai_total_redeemed = dai_s_principal_redeemed.add(dai_a_principal_redeemed).add(dai_s_interest_redeemed).add(dai_a_interest_redeemed);
      let expected_dai_redemption = user_s_principal_tokens_before.add(user_a_principal_tokens_before).add(
        S_INTEREST_EARNED.mul(user_s_dsec_tokens_before).div((await saffron.dsec_token_S.totalSupply()))).add(
        A_INTEREST_EARNED.mul(user_a_dsec_tokens_before).div((await saffron.dsec_token_A.totalSupply())));

      console.log("  dai_total_redeemed     : " + dai_total_redeemed.toString());
      console.log("  expected_dai_redemption: " + expected_dai_redemption.toString());
      assert(dai_total_redeemed.eq(expected_dai_redemption), "incorrect total amount redeemed");

      // Redeem UNI principal
      let user_univ2_before = await evm.UNIV2.balanceOf.call(user.address);
      let user_uni_principal_tokens_before = await saffron.principal_token_uniswap.balanceOf(user.address);
      if (user_uni_principal_tokens_before.gt(ZERO_BN)) {
        await saffron.principal_token_uniswap.approve(contracts.distributionUniPrincipal.address, user_uni_principal_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionUniPrincipal.redeem( {from: user.address, gasPrice:ZERO_BN});
      }
      let uni_total_redeemed = (await evm.UNIV2.balanceOf.call(user.address)).sub(user_univ2_before);
      let expected_univ2_redemption = user_uni_principal_tokens_before.mul(UNI_PRINCIPAL_AMOUNT).div((await saffron.principal_token_uniswap.totalSupply()));

      console.log("  uni_total_redeemed      : " + uni_total_redeemed.toString());
      console.log("  expected_uni_redemption : " + expected_univ2_redemption.toString());
      assert(uni_total_redeemed.eq(expected_univ2_redemption), "incorrect total amount redeemed");

      // Redeem Uni dsec
      let user_sfi_before = await saffron.SFI.balanceOf.call(user.address);
      let user_uni_dsec_tokens_before = await saffron.dsec_token_uniswap.balanceOf(user.address);
      if (user_uni_dsec_tokens_before.gt(ZERO_BN)) {
        await saffron.dsec_token_uniswap.approve(contracts.distributionUniSFI.address, user_uni_dsec_tokens_before, {from: user.address, gasPrice: ZERO_BN})
        await contracts.distributionUniSFI.redeem( {from: user.address, gasPrice:ZERO_BN});
      }
      let sfi_total_redeemed = (await saffron.SFI.balanceOf.call(user.address)).sub(user_sfi_before);
      let expected_sfi_redemption = user_uni_dsec_tokens_before.mul(UNI_SFI_EARNED).div((await saffron.dsec_token_uniswap.totalSupply()));

      console.log("  sfi_redeemed : " + sfi_total_redeemed.toString());
      console.log("  expected_sfi : " + expected_sfi_redemption.toString());
      assert(sfi_total_redeemed.eq(expected_sfi_redemption), "incorrect total amount redeemed");

      // Add up redemptions-to-date
      aggregate_DAI_redeemed = aggregate_DAI_redeemed.add(dai_total_redeemed);
      aggregate_SFI_redeemed = aggregate_SFI_redeemed.add(sfi_total_redeemed);
      aggregate_UNI_redeemed = aggregate_UNI_redeemed.add(uni_total_redeemed);

      // ToDo verify lp tokens are zeroed
      count++;
    }

    // Ensure we don't redeem too much
    assert(aggregate_DAI_redeemed.lte(DAI_TOTAL), "redeemed too much DAI");
    assert(aggregate_SFI_redeemed.lte(UNI_SFI_EARNED), "redeemed too much SFI");
    assert(aggregate_UNI_redeemed.lte(UNI_PRINCIPAL_AMOUNT), "redeemed too much SFI");
    console.log("Redeemed " + count.toString() + " users' funds");
    console.log("  " + aggregate_DAI_redeemed.toString() + " / " + DAI_TOTAL.toString() + " DAI");
    console.log("  " + aggregate_SFI_redeemed.toString() + " / " + UNI_SFI_EARNED.toString() + " SFI");
    console.log("  " + aggregate_UNI_redeemed.toString() + " / " + UNI_PRINCIPAL_AMOUNT.toString() + " UNIV2");
  }

  it('DAI rescue', async function () {
    await rescueDai();
  });
  it('Test user redeem', async function () {
    // await rescueDai();
    await testUserRedeem();
  }).timeout(99999999);
});

