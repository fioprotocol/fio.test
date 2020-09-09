# Contributing to fio.test

Interested in contributing a test case? That's awesome! Here are some guidelines to get started quickly and easily
1. Propose a test case. This will be done using a github issue
2. Submit your test case for approval
3. Code the test and submit a PR


If you would like to contribute to the FIO test suite you will need to follow these steps:

## Proposing a test case

(Please **search for existing test cases**. Help us keep duplicate tests to a minimum by checking to see if someone has already coded a similar test case.)

Before you start coding you should raise an issue using the GitHub issue tracker that  contains a full description of your test case. A good test case should contain the following:

* The action or API that is being tested
* A brief summary of the test case
* A list of test cases
* Blockchain startup requirements such as specific user accounts or token allocations.
* etc...

Refer to http://github.com/needlinktogoodtestcase as an example that can be used as a template.

## Submitting your test case for approval

After you have completed your test case, submit it for approval by posting a "Ready for review" comment at the end of the issue. We also recommend posting a note out to the FIO telegram stating that you have submitted a test case for review.

## The fio.test harness

The fio.test harness uses [Mocha](https://mochajs.org) to structure the assertions. Please refer to the Mocha web site for installation and documentation. We do not want to be overly restrictive regaring the structure of tests as we want to leave room for innovation, but there are a few best practices we recommend:

1. Avoid long dependency chains. It is a good idea to design each **describe** section as a standalone test. This means that all account setup occurs either within the **before** hook or directly within the **describe**.

## Code the test case and submit PR

You may get comments on the test case. These discussions will generally happen within the issue. Once all comments have been resolved and a FIO community member has signaled that the test case is accepted, you are ready to code!

### Coding against fio.test:

The **[master](https://github.com/dapixio/fio.test/tree/master)** branch contains the latest release of the FIO test suite. This branch may be used in test the latest release of FIO. All work on the next release happens here so you should generally branch off `master`.

### Testing and Quality Assurance

Initial testing should occur against a local development build that is set up to enable the appropriate blockchain accounts and permissions.

Additional testing against the [FIO testnet](http://monitor.testnet.fioprotocol.io) is also desireable. Please make note of any test accounts that need to be pre-configured or pre-funded in order to run the test.

### Submitting pull requests

After completing the test case and confirming it runs without error, raise a PR. Your PR should be linked to the original issue to ensure there is enough information available for your PR to be properly reviewed and merged.

## Contributor License & Acknowledgments

Whenever you make a contribution to this project, you license your contribution under the same terms as set out in [LICENSE](./LICENSE), and you represent and warrant that you have the right to license your contribution under those terms.  
