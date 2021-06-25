module.exports = async ({ ethers, network, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const chainId = await getChainId()
  if (chainId == "56" || (chainId == "31337" && network.config.forking)) {
    console.log("only mainnet or testnet can deploy mocks, chainId:", chainId)
    return
  }

  let factory = await deploy("MdexFactoryMock", {
    from: deployer,
    contract: "MdexFactory",
    args: ["0x0000000000000000000000000000000000000000"],
    log: true,
  })

  await deploy("tUSDT", {
    from: deployer,
    contract: "RevertingERC20Mock",
    log: true,
    args: ["tUSDT", "tUSDT", 18, ethers.utils.parseEther("1000000000")],
  })

  let tWBNB9 = await deploy("tWBNB9", {
    from: deployer,
    contract: "WETH9Mock",
    log: true,
  })

  await deploy("MdexRouterMock", {
    from: deployer,
    contract: "MdexRouter",
    args: [factory.address, tWBNB9.address],
    log: true,
  })
}
module.exports.tags = ["MdxSwapMock"]
