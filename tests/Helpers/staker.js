const { callFioApi, newUser } = require("../../utils.js");
const config = require('../../config');

class Staker {
  /**
   * A class of helpers to validate staking lock periods
   *
   * Not in functioning form, very much still WIP
   */
  lockDuration; secondsPerDay; durActual1; durActual2; durActual3; durActual4; durActual5; dayNumber; prevBalance; prevAvailable; prevStaked; prevSrps; roe;

  constructor () {
    //TODO: consider passing these config values in to eliminate the need to require the whole file
    this.lockDuration = config.UNSTAKELOCKDURATIONSECONDS;
    this.secondsPerDay = config.SECONDSPERDAY;
    this.durActual1 = 0;
    this.durActual2 = 0;
    this.durActual3 = 0;
    this.durActual4 = 0;
    this.durActual5 = 0;
    this.dayNumber = 0;
    this.srps = 0;
    this.prevBalance = 0;
    this.prevAvailable = 0;
    this.prevStaked = 0;
    this.prevSrps = 0;
    this.roe = null;
  }

  async createSdk(faucet) {
    let user = await newUser(faucet)
    this.privateKey = user.privateKey
    this.publicKey = user.publicKey
    this.account = user.account
    this.sdk = user.sdk
    this.domain = user.domain
    this.address = user.address
    console.log('Staker pubkey: ', user.publicKey)
  }

  async stake(amount) {
    try {
      const result = await this.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: this.address,
          amount: amount,
          actor: this.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null);
    }

    try {
      table = await callFioApi("get_table_rows", json);
    } catch (err) {
      throw new Error(`error getting locktokensv2 records\n${err}`);
    }
  }

  async getUserBalance () {
    /**
     * Method for the validator to call getFioBalance from a given user object
     * @param {Object} user a user object
     */
    try {
      return await this.sdk.genericAction('getFioBalance', {});
    } catch (err) {
      throw new Error('error getting balance object');
    }
  }

  async setPrevBalances (prevBalance, prevAvailable, prevStaked, prevSrps, prevRoe) {
    /**
     * Set validator instance balance vars to the values of args
     * @param {number} prevBalance a balance value taken from the results of getFioBalance
     * @param {number} prevAvailable available balance taken from the same
     * @param {number} prevStaked staked balance
     * @param {number} prevSrps SRP balance
     * @param {string} prevRoe ROE balance
     */
    this.prevBalance = prevBalance;
    this.prevAvailable = prevAvailable;
    this.prevStaked = prevStaked;
    this.prevSrps = prevSrps;
    this.prevRoe = prevRoe;
  }

  async printPrevBalances() {
    console.log('PREVIOUS BALANCE');
    console.log('prevBalance: ', this.prevBalance);
    console.log('prevAvailable: ', this.prevAvailable);
    console.log('prevStaked: ', this.prevStaked);
    console.log('prevSrps: ', this.prevSrps);
    console.log('prevRoe: ', this.prevRoe);
  }

  async setPrevLockPeriods(prevOwnerAccount = '', prevLockAmount = 0, prevPayoutsPerformed = 0, prevCanVote = 0, prevPeriods = [], prevRemainingLockAmount = 0, prevTimestamp = 0, prevNumberOfPeriods = 0) {
    this.prevOwnerAccount = prevOwnerAccount;
    this.prevLockAmount = prevLockAmount;
    this.prevPayoutsPerformed = prevPayoutsPerformed;
    this.prevCanVote = prevCanVote;
    this.prevPeriods = prevPeriods;
    this.prevRemainingLockAmount = prevRemainingLockAmount;
    this.prevTimestamp = prevTimestamp;
    this.prevNumberOfPeriods = prevNumberOfPeriods;  // Need to track this to do accurate unstake checking
  }
  
  async validateStakingBalances (user, expBalance, expAvailable, expStaked, expSrps) {
    /**
     * Using the existing validation logic from the getFioBalance tests, verify that the user balance values are expected.
     * Cheating, but the values for the args are still calculated in the test suite
     * @param {Object} user a user object
     * @param {number} expBalance an expeced balance value to check against balanceObj.balance
     * @param {number} expAvailable an expeced available value to check against balanceObj.available
     * @param {number} expStaked an expeced staked value to check against balanceObj.staked
     * @param {number} expSrps an expeced srps value to check against balanceObj.srps
     */
    let balanceObj = await this.getUserBalance(user);  //user.sdk.genericAction('getFioBalance', {});
    if (!user.hasOwnProperty('balance')) {
      user = Object.assign({balance: balanceObj}, user);
    } else {
      user.balance.balance = balanceObj.balance
      user.balance.available = balanceObj.available
      user.balance.staked = balanceObj.staked
      user.balance.srps = balanceObj.srps
      user.balance.roe = balanceObj.roe
    }

    const isValidBal = user.balance.balance === expBalance;
    const isValidAvail = user.balance.available === expAvailable;
    const isValidStaked = user.balance.staked === expStaked;
    // const isValidSrps = user.balance.srps === expSrps;

    // if any of the validation conditions do not meet the passed in argument
    if (!isValidBal || !isValidAvail || !isValidStaked) {     // || !isValidSrps) {
      throw new Error('failed balance validation check');
    }

    await this.setPrevBalances(user.balance.balance, user.balance.available, user.balance.staked, user.balance.srps, user.balance.roe);
    return user;
  }

  async validateStakingLockPeriods (user, expLockAmt, expRemainingLockAmt, expPayoutsPerf, expDuration, periodAmts = []) {
    /**
     * An untested rewrite of a method to validate a users staking lock periods after they unstake FIO
     * Redesigned to work the same way as validateStakingBalances, where expected values are passed in instead of attempting to calculate and store them in the validator
     * @param {Object} user a user object
     * @param {number} expLockAmt expected value of lock_amount returned from locktokensv2
     * @param {number} expRemainingLockAmt expected value of remaining_lock_amount
     * @param {number} expPayoutsPerf expected number of payouts_performed
     * @param {number} expDuration expected stake duration value
     * @param {Array} periodAmts an array of amounts to unstake
     */
    if (!user.hasOwnProperty('validUnlockPeriods')) {
      user = Object.assign({validUnlockPeriods: false}, user);
    }

    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: user.account,
      upper_bound: user.account,
      key_type: 'i64',
      index_position: '2'
    }
    try {
      table = await callFioApi("get_table_rows", json);
    } catch (err) {
      throw new Error(`error getting locktokensv2 records\n${err}`);
    }

    let table;
    let isValid = false;
    // let totalAmt = 0;
    // let totalDuration = 0;
    // console.log(`[dbg] expectedDuration: ${expectedDuration}`);

    // for (let i = 0; i < table.rows[0].periods.length; i++) {
    //   totalAmt += table.rows[0].periods[i].amount;
    // }
    //
    // totalDuration = table.rows[0].periods[table.rows[0].periods.length - 1].duration

    // isValid =             //table.rows[0].lock_amount === totalAmt &&
    //   totalDuration > expDuration - 3 &&
    //   totalDuration < expDuration + 3;

    isValid = table.rows[0].lock_amount === expLockAmt &&
      table.rows[0].remaining_lock_amount === expRemainingLockAmt &&
      table.rows[0].payouts_performed === expPayoutsPerf &&
      table.rows[0].periods[table.rows[0].periods.length - 1].amount === periodAmts[table.rows[0].periods.length - 1];

    user.validUnlockPeriods = isValid;
    this.lockDuration = table.rows[0].periods[table.rows[0].periods.length - 1].duration;
    return user;  //TODO: Return the user with the appended result or just the result?
  }

  async validatePeriod (tableObj) {
    throw new Error('not yet implemented');
  }

  async confirmMultipleUsersLockPeriodsAddedCorrectly (stakingUsers) {
    throw new Error('not yet implemented');
  }

}

module.exports = Staker;
