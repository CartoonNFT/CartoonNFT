require("@nomiclabs/hardhat-ethers");

// task action function receives the Hardhat Runtime Environment as second argument
task("faucet", "send ethers and token to hardhat network")
  .addOptionalParam("account", "The account for receiving from faucet")
  .setAction(async function (params, { ethers, network }) {
    const { deployer, dev } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);

    let { WBNB, USDT, MDXFactory, MDXRouter } = await getNamedAccounts();
    const chainId = await getChainId();
    if (chainId != "31337") {
      console.log("faucet only support localchain");
      return;
    }

    const cto = await ethers.getContract("CartoonToken");
    const ncto = await ethers.getContract("NCTO");
    const cardSpec = await ethers.getContract("CardSpec");
    await cto.grantRole(await cto.MINT_ROLE(), deployer);
    await cto.mint(params.account, ethers.utils.parseEther("100000.0"));
    await cto.mint(signer.address, ethers.utils.parseEther("100000.0"));

    await ncto.grantRole(await ncto.MINT_ROLE(), deployer);
    for (let i = 0; i < 5; i++) {
      await ncto.mintCard(params.account, 21);
      await ncto.mintCard(params.account, 22);
      await ncto.mintCard(params.account, 23);
    }

    // liquidity
    let mdxFactory, mdxRouter, tUSDT;
    let forking = false;
    try {
      mdxFactory = await ethers.getContract("MdexFactoryMock");
    } catch (e) {
      forking = true;
      console.log("using forking network");
    }
    if (chainId == "31337" && forking) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xC86BA44Ad1ab1D2329833a8E186B568e87295619"],
      });
      let wallet = await ethers.getSigner(
        "0xC86BA44Ad1ab1D2329833a8E186B568e87295619"
      );
      // Send ethers
      await wallet.sendTransaction({
        to: params.account,
        value: ethers.utils.parseEther("1000.0"),
      });
      tUSDT = await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        USDT
      );
      mdxFactory = await ethers.getContractAt(
        "contracts/interfaces/IMdexFactory.sol:IMdexFactory",
        MDXFactory
      );
      mdxRouter = await ethers.getContractAt(
        "contracts/interfaces/IMdexRouter.sol:IMdexRouter",
        MDXRouter
      );
      await tUSDT
        .connect(wallet)
        .transfer(params.account, ethers.utils.parseEther("100000.0"));
      await tUSDT
        .connect(wallet)
        .transfer(signer.address, ethers.utils.parseEther("100000.0"));
    } else {
      await signer.sendTransaction({
        to: params.account,
        value: ethers.utils.parseEther("1000.0"),
      });
      mdxFactory = await ethers.getContract("MdexFactoryMock");
      tUSDT = await ethers.getContract("tUSDT");
      WBNB = (await ethers.getContract("tWBNB9")).address;
      mdxRouter = await ethers.getContract("MdexRouterMock");
      await tUSDT.transfer(params.account, ethers.utils.parseEther("100000.0"));
      await tUSDT.transfer(signer.address, ethers.utils.parseEther("100000.0"));
    }

    const deadline = Math.round(
      new Date(new Date().getTime() + 3600 * 1000).getTime() / 1000
    );
    await cto.approve(
      mdxRouter.address,
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
    );
    await tUSDT.approve(
      mdxRouter.address,
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
    );
    await mdxRouter.addLiquidity(
      tUSDT.address,
      cto.address,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
      0,
      0,
      params.account,
      deadline
    );
    await mdxRouter.addLiquidityETH(
      cto.address,
      ethers.utils.parseEther("1000"),
      0,
      0,
      params.account,
      deadline,
      {
        value: ethers.utils.parseEther("10"),
      }
    );

    await cto.approve(mdxRouter.address, 0);
    await tUSDT.approve(mdxRouter.address, 0);
    let cto_usdt = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      await mdxFactory.getPair(cto.address, tUSDT.address)
    );
    let cto_bnb = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      await mdxFactory.getPair(cto.address, WBNB)
    );
    console.log(
      "cto_usdt",
      params.account,
      "balance",
      (await cto_usdt.balanceOf(params.account)).toString()
    );
    console.log(
      "cto_bnb",
      params.account,
      "balance",
      (await cto_bnb.balanceOf(params.account)).toString()
    );
    console.log(
      "cto",
      params.account,
      "balance",
      (await cto.balanceOf(params.account)).toString()
    );
    console.log(
      "usdt",
      params.account,
      "balance",
      (await tUSDT.balanceOf(params.account)).toString()
    );
    console.log(
      "bnb",
      params.account,
      "balance",
      (await ethers.provider.getBalance(params.account)).toString()
    );
    console.log(
      "ncto id: 21",
      params.account,
      "balance",
      (
        await ncto.getIdentityTokenLength(
          params.account,
          await cardSpec.getIdentityFromCardId(21)
        )
      ).toString()
    );
    console.log(
      "ncto id: 22",
      params.account,
      "balance",
      (
        await ncto.getIdentityTokenLength(
          params.account,
          await cardSpec.getIdentityFromCardId(22)
        )
      ).toString()
    );
    console.log(
      "ncto id: 23",
      params.account,
      "balance",
      (
        await ncto.getIdentityTokenLength(
          params.account,
          await cardSpec.getIdentityFromCardId(23)
        )
      ).toString()
    );
  });

module.exports = {};
