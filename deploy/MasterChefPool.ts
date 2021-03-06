module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cto = await ethers.getContract("CartoonToken")
  //   const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")
  await deploy("MasterChef", {
    from: deployer,
    contract: "MasterChef",
    args: [
      cto.address,
      10, //cto per block
      6719210, // startBlock
    ],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["MasterChef"]
module.exports.dependencies = ["CartoonToken"]
