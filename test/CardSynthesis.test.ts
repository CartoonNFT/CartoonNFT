import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("Card Synthesis Market", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.SynthesisMarket = await ethers.getContractFactory("SynthesisMarket")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    // init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(3, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(4, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(5, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(100, 1, ethers.utils.formatBytes32String("what?"))
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    // init nft

    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    // init card synthesis
    this.synthesisMarket = await this.SynthesisMarket.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.dave.address)
    await this.synthesisMarket.deployed()

    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  })
  it("should be set unit price", async function () {
    expect(await this.synthesisMarket.unitPrice()).equal(ethers.utils.parseUnits("1", 18))
    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("2", 18))
    expect(await this.synthesisMarket.unitPrice()).equal(ethers.utils.parseUnits("2", 18))
  })
  it("should be set synthesis card", async function () {
    await this.synthesisMarket.connect(this.bob).setSynthesisCardId(111).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.setSynthesisCardId(111).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.setSynthesisCardId(5)
    expect(await this.synthesisMarket.synthesisCardId()).equal(5)
  })

  it("should be add swap card list", async function () {
    // role check
    await this.synthesisMarket.connect(this.bob).addSwapCardList([0, 1, 2, 3, 4]).should.be.rejectedWith("Ownable: caller is not the owner")
    // card range check
    await this.synthesisMarket.addSwapCardList([0, 1, 2, 3, 7]).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.addSwapCardList([0, 1, 2, 3, 4])

    expect(await this.synthesisMarket.getSwapCardListLength()).equal(5)
    expect(await this.synthesisMarket.containSwapCardList(0)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(1)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(2)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(3)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(4)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(110)).to.be.false

    expect(await this.synthesisMarket.getSwapCardList()).eql([
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      ethers.BigNumber.from(2),
      ethers.BigNumber.from(3),
      ethers.BigNumber.from(4),
    ])
  })
  it("should be check pause", async function () {
    await this.synthesisMarket.pause()
    await this.synthesisMarket.synthesis([1]).should.be.rejectedWith("Pausable: paused")
    await this.synthesisMarket.unpause()
    await this.synthesisMarket.synthesis([1]).should.be.rejectedWith("length mismatch")
  })
  it("should be change dev", async function () {
    expect(await this.synthesisMarket.devaddr()).equal(this.dave.address)
    await this.synthesisMarket.connect(this.bob).dev(this.isaac.address).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.dev(this.isaac.address)
    expect(await this.synthesisMarket.devaddr()).equal(this.isaac.address)
  })
})

describe("Card Synthesis", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.SynthesisMarket = await ethers.getContractFactory("SynthesisMarket")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    // init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(3, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(4, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(5, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(100, 1, ethers.utils.formatBytes32String("what?"))
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    // init nft

    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()

    // init card synthesis
    this.synthesisMarket = await this.SynthesisMarket.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.dave.address)
    await this.synthesisMarket.deployed()

    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))

    await this.synthesisMarket.addSwapCardList([0, 1, 2, 3, 4])
    await this.synthesisMarket.setSynthesisCardId(5)

    //mint nft to carol

    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
    for (let i = 0; i < 5; i++) {
      let card = await this.cardSpec.cardTypes(i)
      let tokenPreId = ethers.BigNumber.from(await this.cardSpec.NFT_SIGN())
        .shl(await this.cardSpec.NFT_SIGN_BIT())
        .or(ethers.BigNumber.from(card["skin"]).shl(await this.cardSpec.CARD_SKIN_BIT()))
        .or(ethers.BigNumber.from(card["rarity"]).shl(await this.cardSpec.CARD_RARITY_BIT()))
      await this.nft.mint(this.carol.address, tokenPreId)
    }
    for (let i = 0; i < 5; i++) {
      let card = await this.cardSpec.cardTypes(i)
      let tokenPreId = ethers.BigNumber.from(await this.cardSpec.NFT_SIGN())
        .shl(await this.cardSpec.NFT_SIGN_BIT())
        .or(ethers.BigNumber.from(card["skin"]).shl(await this.cardSpec.CARD_SKIN_BIT()))
        .or(ethers.BigNumber.from(card["rarity"]).shl(await this.cardSpec.CARD_RARITY_BIT()))
      await this.nft.mint(this.carol.address, tokenPreId)
    }
    expect(await this.nft.totalSupply()).equal(10)
    expect(await this.nft.balanceOf(this.carol.address)).equal(10)
  })

  it("should be remove swap card", async function () {
    await this.synthesisMarket.connect(this.bob).removeSwapCardList([0, 1]).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.removeSwapCardList([0, 111]).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.removeSwapCardList([0, 1])

    expect(await this.synthesisMarket.getSwapCardListLength()).equal(3)
    expect(await this.synthesisMarket.containSwapCardList(0)).to.be.false
    expect(await this.synthesisMarket.containSwapCardList(1)).to.be.false
    expect(await this.synthesisMarket.containSwapCardList(2)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(3)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(4)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(110)).to.be.false
  })
  it("should be synthesis", async function () {
    let tokenIds = []
    for (let i = 0; i < 5; i++) {
      tokenIds.push(await this.nft.tokenOfOwnerByIndex(this.carol.address, i))
      // console.log(await this.nft.getTokenIdentity(await this.nft.tokenOfOwnerByIndex(this.carol.address, i)))
    }
    // console.log(await this.synthesisMarket.getSwapCardList())
    await this.token.connect(this.bob).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket
      .connect(this.bob)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[3]])
      .should.be.rejectedWith("length mismatch")
    // no approve
    await this.synthesisMarket.connect(this.eve).synthesis(tokenIds).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

    // no enough balance
    await this.token.connect(this.eve).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket.connect(this.eve).synthesis(tokenIds).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

    // tokenId not owner
    await this.synthesisMarket
      .connect(this.bob)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[4], tokenIds[4]])
      .should.be.rejectedWith("ERC721: transfer caller is not owner nor approved")

    // identity has been exist
    await this.token.connect(this.carol).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.nft.connect(this.carol).approveBulk(this.synthesisMarket.address, tokenIds)

    await this.synthesisMarket
      .connect(this.carol)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[4], tokenIds[4]])
      .should.be.rejectedWith("identity has been exist")
    await this.synthesisMarket
      .connect(this.carol)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[3], 10])
      .should.be.rejectedWith("identity not in list")

    await this.synthesisMarket.connect(this.carol).synthesis(tokenIds).should.be.rejectedWith("Must have mint role")

    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.synthesisMarket.address)

    await this.synthesisMarket.connect(this.carol).synthesis(tokenIds)

    //get info
    expect(await this.synthesisMarket.getAssetIdOfAddress(this.carol.address)).to.have.lengthOf(1)

    expect(await this.synthesisMarket.getAssetIdOfAddress(this.carol.address)).eql([ethers.BigNumber.from(0)])

    let info = await this.synthesisMarket.getAssetInfo(0)
    expect(info["owner"]).equal(this.carol.address)
    expect(info["isRedemption"]).to.be.false
    expect(info["lockTokenIds"]).eql(tokenIds)
    const convertTokenId = info["convertTokenId"]
    expect(await this.cardSpec.getTokenSkin(convertTokenId)).equal(100)
    expect(await this.cardSpec.getTokenRarity(convertTokenId)).equal(1)

    expect(await this.nft.ownerOf(convertTokenId)).equal(this.carol.address)
    expect(await this.nft.balanceOf(this.carol.address)).equal(6)

    // redemption
    await this.synthesisMarket.redemption(0).should.be.rejectedWith("only asset owner")

    await this.synthesisMarket.connect(this.carol).redemption(0).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")
    await this.token.connect(this.carol).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket.connect(this.carol).redemption(0).should.be.rejectedWith("ERC721: transfer caller is not owner nor approved")
    await this.nft.connect(this.carol).approve(this.synthesisMarket.address, convertTokenId)

    await this.synthesisMarket.connect(this.carol).redemption(0)

    // repetitive redemption
    await this.synthesisMarket.connect(this.carol).redemption(0).should.be.rejectedWith("asset has been redemption")

    await this.nft.ownerOf(convertTokenId).should.be.rejectedWith("ERC721: owner query for nonexistent token")
    expect(await this.nft.balanceOf(this.carol.address)).equal(10)
  })
})
