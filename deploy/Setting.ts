module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, WBNB, USDT, MDXFactory } = await getNamedAccounts()
  const { dev } = await ethers.getNamedSigners()
  const { airDrop, consultant, cooperations, operations, IDO, teamRewardAddress, foundationRewardAddress } = await getNamedAccounts()

  const mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)

  const cardSpec = await ethers.getContract("CardSpec")
  const cto = await ethers.getContract("CartoonToken")
  // const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")

  const ncto = await ethers.getContract("NCTO")
  const shop = await ethers.getContract("Shop")
  const mintCard = await ethers.getContract("MintCard")
  const synthesisMarket = await ethers.getContract("SynthesisMarket")
  const coinWindPool = await ethers.getContract("CoinWindPool")
  const coinWindPoolNFT = await ethers.getContract("CoinWindPoolWithNFT")
  const masterChef = await ethers.getContract("MasterChef")
  const teamTimeLock = await ethers.getContract("TeamTimeLock")
  const foundationTimeLock = await ethers.getContract("FoundationTimeLock")

  // timelock
  // await cto.connect(dev).grantRole(await cto.MINT_ROLE(), deployer)
  // const lockReward = (await cto.cap()).div(10).mul(99).div(100)
  // await cto.mint(teamTimeLock.address, lockReward)
  // await cto.mint(foundationTimeLock.address, lockReward)

  // //air drop
  // const airDropReward = (await cto.cap()).mul(2).div(100)
  // await cto.mint(airDrop, airDropReward)

  // //consultant
  // const consultantReward = (await cto.cap()).mul(2).div(100)
  // await cto.mint(consultant, consultantReward)
  // //cooperations
  // const cooperationsReward = (await cto.cap()).mul(7).div(100)
  // await cto.mint(cooperations, cooperationsReward)
  // //operations
  // const operationsReward = (await cto.cap()).mul(6).div(100)
  // await cto.mint(operations, operationsReward)
  // //IDO
  // const IDOReward = (await cto.cap()).mul(13).div(100)
  // await cto.mint(IDO, IDOReward)

  // await cto.connect(dev).revokeRole(await cto.MINT_ROLE(), deployer)

  // add card types
  await cardSpec.addCardType(1000, 1000, ethers.utils.formatBytes32String("role1"))
  await cardSpec.addCardType(1001, 1000, ethers.utils.formatBytes32String("role2"))
  await cardSpec.addCardType(1002, 1000, ethers.utils.formatBytes32String("role3"))
  await cardSpec.addCardType(1003, 1000, ethers.utils.formatBytes32String("role4"))
  await cardSpec.addCardType(1004, 1000, ethers.utils.formatBytes32String("role5"))

  await cardSpec.addCardType(1005, 1000, ethers.utils.formatBytes32String("role6"))
  await cardSpec.addCardType(1006, 1000, ethers.utils.formatBytes32String("role7"))
  await cardSpec.addCardType(1007, 1000, ethers.utils.formatBytes32String("role8"))
  await cardSpec.addCardType(1008, 1000, ethers.utils.formatBytes32String("role9"))
  await cardSpec.addCardType(1009, 1000, ethers.utils.formatBytes32String("role10"))

  await cardSpec.addCardType(1010, 1000, ethers.utils.formatBytes32String("role11"))
  await cardSpec.addCardType(1011, 1000, ethers.utils.formatBytes32String("role12"))
  await cardSpec.addCardType(1012, 1000, ethers.utils.formatBytes32String("role13"))
  await cardSpec.addCardType(1013, 1000, ethers.utils.formatBytes32String("role14"))
  await cardSpec.addCardType(1014, 1000, ethers.utils.formatBytes32String("role15"))

  await cardSpec.addCardType(2000, 2000, ethers.utils.formatBytes32String("lv1"))
  await cardSpec.addCardType(2000, 2001, ethers.utils.formatBytes32String("lv2"))
  await cardSpec.addCardType(2000, 2002, ethers.utils.formatBytes32String("lv3"))

  // set shop permissions
  await shop.setWaiter(mintCard.address)
  await shop.setUnitPrice(ethers.utils.parseUnits("1", 18))

  // mint card to shop
  await ncto.grantRole(await ncto.MINT_ROLE(), mintCard.address)
  await ncto.grantRole(await ncto.UPDATE_TOKEN_URI_ROLE(), mintCard.address)

  let quantity = 5
  for (let i = 0; i < 18; ++i) {
    // console.log("mint card to shop, card Id:", i, "quantity:", quantity)
    await mintCard.safeMint(shop.address, i, quantity)
  }

  //  set synthesisMarket
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarket.address)
  await ncto.grantRole(await ncto.UPDATE_TOKEN_URI_ROLE(), synthesisMarket.address)
  await synthesisMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarket.setSynthesisCardId(15)
  await synthesisMarket.addSwapCardList([0, 1, 2, 3, 4])

  // coinWind
  await cto.grantRole(await cto.MINT_ROLE(), coinWindPool.address)
  await coinWindPool.add(
    10, // allocPoint
    WBNB,
    true
  )
  await coinWindPool.add(
    10, // allocPoint
    USDT,
    true
  )

  // coinWind nft
  await cto.grantRole(await cto.MINT_ROLE(), coinWindPoolNFT.address)
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    5, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    5, //cardId
    true
  )

  // MasterChef
  await mdxFactory.createPair(cto.address, USDT)
  await mdxFactory.createPair(cto.address, WBNB)
  const cto_usdt = await mdxFactory.getPair(cto.address, USDT)
  const cto_wbnb = await mdxFactory.getPair(cto.address, WBNB)

  await cto.grantRole(await cto.MINT_ROLE(), masterChef.address)
  await masterChef.add(
    10, // allocPoint
    cto_wbnb,
    true
  )
  await masterChef.add(
    10, // allocPoint
    cto_usdt,
    true
  )
  console.log(await getNamedAccounts())
  let info = {
    token: {
      address: cto.address,
      dev: await cto.getRoleMember(await cto.ADMIN_ROLE(), 0),
      // "team TimeLock": {
      //   address: teamTimeLock.address,
      //   beneficiary: await teamTimeLock.beneficiary(),
      //   reward: ethers.utils.formatEther(await cto.balanceOf(teamTimeLock.address)),
      //   rewardPerQuarter: ethers.utils.formatEther(await teamTimeLock.fixedQuantity()),
      //   startTime: (await teamTimeLock.startTime()).toString(),
      // },
      // "foundation TimeLock": {
      //   address: foundationTimeLock.address,
      //   beneficiary: await foundationTimeLock.beneficiary(),
      //   reward: ethers.utils.formatEther(await cto.balanceOf(foundationTimeLock.address)),
      //   rewardPerQuarter: ethers.utils.formatEther(await foundationTimeLock.fixedQuantity()),
      //   startTime: (await foundationTimeLock.startTime()).toString(),
      // },
      // airDrop: {
      //   address: airDrop,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(airDrop)),
      // },
      // consultant: {
      //   address: consultant,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(consultant)),
      // },
      // cooperations: {
      //   address: cooperations,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(cooperations)),
      // },
      // operations: {
      //   address: operations,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(operations)),
      // },
      // IDO: {
      //   address: IDO,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(IDO)),
      // },
    },
    nft: {
      address: ncto.address,
      dev: await ncto.getRoleMember(await ncto.ADMIN_ROLE(), 0),
      "card spec": {
        address: cardSpec.address,
        owner: await cardSpec.owner(),
      },
      "nft miner": {
        address: mintCard.address,
        owner: await mintCard.owner(),
      },
    },
    shop: {
      "lucky draw": {
        address: shop.address,
        owner: await shop.owner(),
        devaddr: await shop.devaddr(),
      },
      synthesisMarket: {
        address: synthesisMarket.address,
        owner: await synthesisMarket.owner(),
        devaddr: await synthesisMarket.devaddr(),
      },
    },
    pool: {
      coinWindPool: {
        address: coinWindPool.address,
        owner: await coinWindPool.owner(),
        devaddr: await coinWindPool.devaddr(),
      },
      coinWindPoolNFT: {
        address: coinWindPoolNFT.address,
        owner: await coinWindPoolNFT.owner(),
        devaddr: await coinWindPoolNFT.devaddr(),
      },
      masterChef: {
        address: masterChef.address,
        owner: await masterChef.owner(),
      },
      swapPair: {
        "cto-usdt": cto_usdt,
        "cto-wbnb": cto_wbnb,
      },
    },
  }
  console.log(info)
}
module.exports.dependencies = ["Shop", "SynthesisMarket", "TimeLock", "CoinWindPoolWithNFT", "CoinWindPool", "MasterChef"]
