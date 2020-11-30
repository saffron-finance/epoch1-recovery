# Saffron Epoch 1 Recovery

1. Calculate ratio between rewards LP tokens and DAI/SFI rewards.
2. Move exact amount of redeemable tokens (DAI/SFI/UniV2) into a contract that can redeem each of them.
3. Process withdrawals similar to `remove_liquidity` except instead of on-the-spot calculations use ratio constants.

## Install
```
nvm use 12
npm i
```

## Test

```
npm run test
```

Test simulates every user withdrawing their funds from the contract and asserts that the amount that they recieve is equal to the expected amount. When the withdrawals are complete then every user should have their expected amount and there should be only wei worth of dust left in the contract.

## Deploy

```
npx truffle migrate --network mainnet --reset
```


## Steps to rescue funds (UNI/SFI) from uniswap saffron pool:
_the description below is meant to just show the required steps, and can't be executed directly._

```
  address SFI_TOKEN = 0xb753428af26E81097e7fD17f40c88aaA3E04902c;
  address UNI_TOKEN = 0xC76225124F3CaAb07f609b1D147a31de43926cd6;
  address FUND_RESCUE = /* will be deployed later*/;

  SaffronUniswapLPPool.set_base_asset_address(/* can be set to any address*/);
  SaffronUniswapLPPool.erc_sweep(SFI_TOKEN ,FUND_RESCUE);
  SaffronUniswapLPPool.erc_sweep(UNI_TOKEN ,FUND_RESCUE);

```

## Steps to rescue fund from dai adapter :

```

  address cDAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
  address FUND_RESCUE = /* will be deployed later*/;

  DAI_Compound_Adapter.set_base_asset(cDAI);
  DAI_Compound_Adapter.approve_transfer(FUND_RESCUE, IERC20(cDAI).balanceOf(DAI_Compound_Adapter));
  IFundRescue(FUND_RESCUE).daiRescue();
```
