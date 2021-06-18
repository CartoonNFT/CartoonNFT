require("@nomiclabs/hardhat-ethers");

// task action function receives the Hardhat Runtime Environment as second argument
task("faucet", "send ethers and token to hardhat network")
  .addOptionalParam("account", "The account for receiving from faucet")
  .setAction(async function (params, { ethers, network }) {
    const { USDT } = await getNamedAccounts();
    const { deployer, dev } = await getNamedAccounts();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xC86BA44Ad1ab1D2329833a8E186B568e87295619"],
    });
    const wallet = await ethers.getSigner(
      "0xC86BA44Ad1ab1D2329833a8E186B568e87295619"
    );
    // Send ethers
    await wallet.sendTransaction({
      to: params.account,
      value: ethers.utils.parseEther("1000.0"),
    });
    const USDTContract = await ethers.getContractAt("IERC20", USDT);
    await USDTContract.connect(wallet).transfer(
      params.account,
      ethers.utils.parseEther("100000.0")
    );

    const cto = await ethers.getContract("CartoonToken");
    await cto.grantRole(await cto.MINT_ROLE(), deployer);
    await cto.mint(params.account, ethers.utils.parseEther("100000.0"));
  });

module.exports = {};
