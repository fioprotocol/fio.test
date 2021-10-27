
const stakeTests = {
  
  activateChainStaker: {
    name: "Activate Chain Staker",
    transferAmount : 1004000000000000,  // 1,004,000 FIO
    stakeAmount: [2000000000000, 10000000000, 1000000000000000, 10000000000, 1000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 10000000000, 10000000000, 10000000000, 10000000000, 0, 310000000000, 0, 0, 0, 0, 0, 0, 0, 0],
    transferToken : [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },

  activateChainStaker2: {
    name: "Activate Chain Staker",
    transferAmount: 1004000000000000,  // 1,004,000 FIO
    stakeAmount: [2000000000000, 10000000000, 1000000000000000, 10000000000, 1000000000000, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 10000000000, 10000000000, 10000000000, 10000000000, 0, 310000000000, 0, 0, 0, 0],
    transferToken: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },

  /**
   * Use if you want to execute a lot of rewards prior to doing staking.
   */
  zeroStaker: {
    name: "Zero Staker",
    transferAmount: 100000000000,  // 100 FIO
    stakeAmount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    transferToken: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  zeroStaker8: {
    name: "Zero Staker",
    transferAmount: 100000000000,  // 100 FIO
    stakeAmount: [0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 0, 0, 0, 0, 0, 0, 0],
    transferToken: [0, 0, 0, 0, 0, 0, 0, 0],
  },

  /**
   * Stake: 40M FIO
   * Unstake: batches of 10M FIO
   */
  largeStaker: {
    name: "Large Staker",
    transferAmount: 40000000000000000,  // 40M FIO
    stakeAmount: [30000000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 0, 0, 0, 10000000000000000, 0, 0, 10000000000000000, 0, 0, 10000000000000000, 0, 0, 0, 0,],
    transferToken : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  smallStaker: {
    name: "Small Staker",
    transferAmount : 10000000000,  // 10 FIO
    stakeAmount: [1000000000, 0, 0, 0, 0, 0, 2000000000, 3000000000, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 100000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5000000000, 0, 0, 0],
    transferToken : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  medStaker: {
    name: "Medium Staker",
    transferAmount : 4000000000000,  // 4000 FIO
    stakeAmount : [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount : [0, 200000000000, 100000000000, 100000000000, 0, 100000000000, 100000000000, 0, 0, 0, 0, 0, 0, 0, 0],
    transferToken: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    //transferToken: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  largeSmallMedStaker: {
    name: "Large/Med/Small Staker",
    transferAmount : 4000000000000,  // 4000 FIO
    stakeAmount : [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount : [0, 200000000000, 0],
    transferToken : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  stakeUnstakeStaker: {
    name: "Stake/Unstake Staker",
    transferAmount: 9000000000000000,  // 9.4M FIO
    stakeAmount: [1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0],
    transferToken: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  /**
   * Small ROE ratio:
   *   Small Combined Token Pool:
   *   Large Global SRP Count: 
   * 
   *   Steps:
   *     1) Reset chain
   *     2) Run with roeRatioSmall
   */
  roeRatioSmall: {
    name: "Stake/Unstake Staker",
    transferAmount: 9000000000000000,  // 9.4M FIO
    stakeAmount: [1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0],
    transferToken: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  /**
   * Large ROE ratio:
   *   Large Combined Token Pool: 
   *   Small Global SRP Count
   * 
   *   Steps:
   *     1) Update fio.contracts: const DAILYSTAKINGMINTTHRESHOLD = 2500000000000000  to 2.5M FIO and rebuild contracts
   *     2) Run with activateChainStaker
   *     2) Execute a 25M in rewards transfers by setting const totalDays = 10 with zeroStaker
   *     3) Run with roeRatioLarge
   */
  roeRatioLarge: {
    name: "ROE Ratio Large Staker",
    transferAmount: 9400000000000000,  // 9.4M FIO
    stakeAmount: [9000000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    unstakeAmount: [0, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0, 0],
    transferToken: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
  
}

module.exports = stakeTests;