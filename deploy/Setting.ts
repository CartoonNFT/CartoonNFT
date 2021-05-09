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
  const swapMarket = await ethers.getContract("SwapMarket")
  const synthesisMarketV1 = await ethers.getContract("SynthesisMarketV1")
  const synthesisMarketV2 = await ethers.getContract("SynthesisMarketV2")
  const synthesisMarketV3 = await ethers.getContract("SynthesisMarketV3")
  const coinWindPool = await ethers.getContract("CoinWindPool")
  const coinWindPoolNFT = await ethers.getContract("CoinWindPoolWithNFT")
  const masterChef = await ethers.getContract("MasterChef")

  // add card types
  await cardSpec.addCardType(1000, 1001, ethers.utils.formatBytes32String("Jun Uozumi"))
  await cardSpec.addCardType(1001, 1002, ethers.utils.formatBytes32String("Akira Sendoh"))
  await cardSpec.addCardType(1002, 1000, ethers.utils.formatBytes32String("Kicchou Fukuda"))
  await cardSpec.addCardType(1003, 1000, ethers.utils.formatBytes32String("Hiroaki Koshino"))
  await cardSpec.addCardType(1004, 1000, ethers.utils.formatBytes32String("Tomoyuki Uekusa"))

  await cardSpec.addCardType(1005, 1002, ethers.utils.formatBytes32String("Hanamichi Sakuragi"))
  await cardSpec.addCardType(1006, 1001, ethers.utils.formatBytes32String("Takenori Akagi"))
  await cardSpec.addCardType(1007, 1002, ethers.utils.formatBytes32String("Kaede Rukawa"))
  await cardSpec.addCardType(1008, 1001, ethers.utils.formatBytes32String("Hisashi Mitsui"))
  await cardSpec.addCardType(1009, 1000, ethers.utils.formatBytes32String("Ryota Miyagi"))

  await cardSpec.addCardType(1010, 1002, ethers.utils.formatBytes32String("Shinichi Maki"))
  await cardSpec.addCardType(1011, 1001, ethers.utils.formatBytes32String("Soichiro Jin"))
  await cardSpec.addCardType(1012, 1001, ethers.utils.formatBytes32String("Nobunaga Kiyota"))
  await cardSpec.addCardType(1013, 1000, ethers.utils.formatBytes32String("Yoshinori Miyawasu"))
  await cardSpec.addCardType(1014, 1000, ethers.utils.formatBytes32String("Kazuma Takasago"))

  await cardSpec.addCardType(1015, 1002, ethers.utils.formatBytes32String("Kenji Fujima"))
  await cardSpec.addCardType(1016, 1001, ethers.utils.formatBytes32String("Toru Hanagata"))
  await cardSpec.addCardType(1017, 1000, ethers.utils.formatBytes32String("Kazushi Hasegawa"))
  await cardSpec.addCardType(1018, 1000, ethers.utils.formatBytes32String("Mitsuru Nagano"))
  await cardSpec.addCardType(1019, 1000, ethers.utils.formatBytes32String("Shoichi Takano"))

  await cardSpec.addCardType(2000, 1000, ethers.utils.formatBytes32String("MiningCardv1"))
  await cardSpec.addCardType(2001, 1001, ethers.utils.formatBytes32String("MiningCardv2"))
  await cardSpec.addCardType(2002, 1002, ethers.utils.formatBytes32String("MiningCardv3"))

  // mint card to shop
  await ncto.grantRole(await ncto.MINT_ROLE(), shop.address)
  await ncto.grantRole(await ncto.UPDATE_TOKEN_URI_ROLE(), deployer)
  await ncto.setBaseURI(process.env.BASE_URI)
  await shop.setUnitPrice(ethers.utils.parseUnits("1", 18))


  for (let i = 0; i < 20; i++) {
    await shop.changeBlindBoxCard(i, 100)
  }

  // swapMarket
  await ncto.grantRole(await ncto.MINT_ROLE(), shop.address)
  await swapMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await swapMarket.addSwapCardList(2, [3, 4, 9, 13, 14, 17, 18, 19])
  await swapMarket.addSwapCardList(3, [2, 4, 9, 13, 14, 17, 18, 19])
  await swapMarket.addSwapCardList(4, [2, 3, 9, 13, 14, 17, 18, 19])
  await swapMarket.addSwapCardList(9, [2, 3, 4, 13, 14, 17, 18, 19])
  await swapMarket.addSwapCardList(13, [2, 3, 4, 9, 14, 17, 18, 19])
  await swapMarket.addSwapCardList(14, [2, 3, 4, 9, 13, 17, 18, 19])
  await swapMarket.addSwapCardList(17, [2, 3, 4, 9, 13, 14, 18, 19])
  await swapMarket.addSwapCardList(18, [2, 3, 4, 9, 13, 14, 17, 19])
  await swapMarket.addSwapCardList(19, [2, 3, 4, 9, 13, 14, 17, 18])

  await swapMarket.addSwapCardList(0, [6, 8, 11, 12, 16])
  await swapMarket.addSwapCardList(6, [0, 8, 11, 12, 16])
  await swapMarket.addSwapCardList(8, [0, 6, 11, 12, 16])
  await swapMarket.addSwapCardList(11, [0, 6, 8, 12, 16])
  await swapMarket.addSwapCardList(12, [0, 6, 8, 12, 16])
  await swapMarket.addSwapCardList(16, [0, 6, 8, 11, 12])

  await swapMarket.addSwapCardList(1, [5, 7, 10, 15])
  await swapMarket.addSwapCardList(5, [1, 7, 10, 15])
  await swapMarket.addSwapCardList(7, [1, 5, 10, 15])
  await swapMarket.addSwapCardList(10, [1, 5, 7, 15])
  await swapMarket.addSwapCardList(15, [1, 5, 7, 10])

  //  set synthesisMarketV1
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV1.address)
  await synthesisMarketV1.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV1.setSynthesisCardId(20)
  await synthesisMarketV1.addSwapCardList([2, 3, 4, 9, 13, 14, 17, 18, 19])
  //  set synthesisMarketV2
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV2.address)
  await synthesisMarketV2.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV2.setSynthesisCardId(21)
  await synthesisMarketV2.addSwapCardList([0, 6, 8, 11, 12, 16])
  //  set synthesisMarketV3
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV3.address)
  await synthesisMarketV3.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV3.setSynthesisCardId(22)
  await synthesisMarketV3.addSwapCardList([1, 5, 7, 10, 15])

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
    15, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    15, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    16, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    16, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    17, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    17, //cardId
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
    },
    shop: {
      lottery: {
        address: shop.address,
        owner: await shop.owner(),
        devaddr: await shop.devaddr(),
      },
      synthesisMarketV1: {
        address: synthesisMarketV1.address,
        owner: await synthesisMarketV1.owner(),
        devaddr: await synthesisMarketV1.devaddr(),
      },
      synthesisMarketV2: {
        address: synthesisMarketV2.address,
        owner: await synthesisMarketV2.owner(),
        devaddr: await synthesisMarketV2.devaddr(),
      },
      synthesisMarketV3: {
        address: synthesisMarketV3.address,
        owner: await synthesisMarketV3.owner(),
        devaddr: await synthesisMarketV3.devaddr(),
      },
      swapMarket: {
        address: swapMarket.address,
        owner: await swapMarket.owner(),
        devaddr: await swapMarket.devaddr(),
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
module.exports.dependencies = ["Shop", "SynthesisMarket", "SwapMarket", "TimeLock", "CoinWindPoolWithNFT", "CoinWindPool", "MasterChef"]
