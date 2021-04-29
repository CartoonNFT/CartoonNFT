module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cardSpec = await ethers.getContract("CardSpec")
  const cto = await ethers.getContract("CartoonToken")
  //   const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")

  const ncto = await ethers.getContract("NCTO")
  for (let i = 1; i < 4; i++) {
    await deploy("SynthesisMarketV" + i, {
      from: deployer,
      contract: "SynthesisMarket",
      args: [cardSpec.address, cto.address, ncto.address, dev],
      log: true,
      deterministicDeployment: false,
    })
  }
}
module.exports.dependencies = ["CardSpec", "NCTO", "CartoonToken"]
module.exports.tags = ["SynthesisMarket"]
