module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev, MDX, WBNB, CoinWind } = await getNamedAccounts()

  const cto = await ethers.getContract("CartoonToken")
  //   const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")
  await deploy("CoinWindPool", {
    from: deployer,
    contract: "CoinWindPool",
    args: [
      cto.address,
      MDX,
      WBNB,
      CoinWind,
      10, //cto per block
      6719210, // startBlock
      dev,
    ],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["CoinWindPool"]
module.exports.dependencies = ["CartoonToken"]
