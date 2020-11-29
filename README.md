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
