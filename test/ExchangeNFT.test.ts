import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("ExchangeNFT", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.ExchangeNFT = await ethers.getContractFactory("ExchangeNFT")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    // mint token to signers
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    //init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()

    await this.cardSpec.addCardType(1000, 2000, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(1001, 2001, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(1002, 2002, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(1003, 2003, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(1004, 2004, ethers.utils.formatBytes32String("what?"))
    // init nft
    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)

    // mint card
    for (let i = 1; i < 6; i++) {
      this.nft.mintCard(this.bob.address, i)
    }
    // init exchangeNFT
    this.exchangeNFT = await this.ExchangeNFT.deploy(this.nft.address, this.token.address, this.eve.address)
    await this.exchangeNFT.deployed()
    // set exchangeNFT fee
    await this.exchangeNFT.setFeeToRate(ethers.utils.parseUnits("1", 10))
  })
  it("should be set fee rate", async function () {
    expect(await this.exchangeNFT.feeToRate()).equal(ethers.utils.parseUnits("1", 10))
    // require owner
    await this.exchangeNFT
      .connect(this.bob)
      .setFeeToRate(ethers.utils.parseUnits("2", 10))
      .should.be.rejectedWith("Ownable: caller is not the owner")
    // change unit price
    await this.exchangeNFT.setFeeToRate(ethers.utils.parseUnits("2", 12)).should.be.rejectedWith("fee out of range")
    await this.exchangeNFT.setFeeToRate(ethers.utils.parseUnits("2", 10))
    expect(await this.exchangeNFT.feeToRate()).equal(ethers.utils.parseUnits("2", 10))
  })
  it("should be change dev", async function () {
    expect(await this.exchangeNFT.devaddr()).equal(this.eve.address)
    await this.exchangeNFT.connect(this.bob).dev(this.isaac.address).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.exchangeNFT.dev(this.isaac.address)
    expect(await this.exchangeNFT.devaddr()).equal(this.isaac.address)
  })
  it("should be shelves", async function () {
    expect(await this.exchangeNFT.getAskLength()).equal(0)
    let tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
    await this.exchangeNFT.readyToSellToken(tokenId, ethers.utils.parseEther("1")).should.be.rejectedWith("Only Token Owner can sell token")
    await this.exchangeNFT.connect(this.bob).readyToSellToken(tokenId, 0).should.be.rejectedWith("Price must be granter than zero")
    await this.exchangeNFT
      .connect(this.bob)
      .readyToSellToken(tokenId, ethers.utils.parseEther("1"))
      .should.be.rejectedWith("ERC721: transfer caller is not owner nor approved")
    await this.nft.connect(this.bob).approve(this.exchangeNFT.address, tokenId)
    await this.exchangeNFT.connect(this.bob).readyToSellToken(tokenId, ethers.utils.parseEther("1"))
    expect(await this.nft.ownerOf(tokenId)).equal(this.exchangeNFT.address)
    expect(await this.exchangeNFT.getAskLength()).equal(1)
    let info = await this.exchangeNFT.getAsks()
    expect(info[0].tokenId).equal(tokenId)
    expect(info[0].price).equal(ethers.utils.parseEther("1"))
    expect(await this.exchangeNFT.getAsksDesc()).eql(info)
    expect(await this.exchangeNFT.getAsksByPage(0, 10)).eql(info)
    expect(await this.exchangeNFT.getAsksByPageDesc(0, 10)).eql(info)
    expect(await this.exchangeNFT.getAsksByUser(this.bob.address)).eql(info)
    expect(await this.exchangeNFT.getAsksByUserDesc(this.bob.address)).eql(info)
  })
  context("shelves", function () {
    beforeEach(async function () {
      this.tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
      await this.nft.connect(this.bob).approve(this.exchangeNFT.address, this.tokenId)
      await this.exchangeNFT.connect(this.bob).readyToSellToken(this.tokenId, ethers.utils.parseEther("1"))
    })
    it("should be reset price", async function () {
      await this.exchangeNFT.connect(this.bob).setCurrentPrice(111, 0).should.be.rejectedWith("Only Seller can update price")
      await this.exchangeNFT.connect(this.bob).setCurrentPrice(this.tokenId, 0).should.be.rejectedWith("Price must be granter than zero")
      await this.exchangeNFT.connect(this.bob).setCurrentPrice(this.tokenId, ethers.utils.parseEther("2"))

      let info = await this.exchangeNFT.getAsks()
      expect(info[0].tokenId).equal(this.tokenId)
      expect(info[0].price).equal(ethers.utils.parseEther("2"))
    })
    it("buy it", async function () {
      let carolOldBalance = await this.token.balanceOf(this.carol.address)
      let bobOldBalance = await this.token.balanceOf(this.bob.address)
      await this.exchangeNFT.buyToken(1212).should.be.rejectedWith("Token not in sell book")
      await this.exchangeNFT.connect(this.carol).buyToken(this.tokenId).should.be.rejectedWith("ERC20: transfer amount exceeds allowance")
      await this.token.connect(this.carol).approve(this.exchangeNFT.address, ethers.utils.parseEther("1"))
      await this.exchangeNFT.connect(this.carol).buyToken(this.tokenId)
      expect(await this.token.balanceOf(this.carol.address)).equal(carolOldBalance.sub(ethers.utils.parseEther("1")))
      expect(await this.token.balanceOf(this.eve.address)).equal(ethers.utils.parseEther("0.01"))
      expect(await this.token.balanceOf(this.bob.address)).equal(bobOldBalance.add(ethers.utils.parseEther("0.99")))
    })
    it("should be cancel it", async function () {
      expect(await this.exchangeNFT.getAskLength()).equal(1)
      await this.exchangeNFT.connect(this.bob).cancelSellToken(111).should.be.rejectedWith("Only Seller can cancel sell token")
      await this.exchangeNFT.connect(this.bob).cancelSellToken(this.tokenId)
      expect(await this.exchangeNFT.getAskLength()).equal(0)
    })
    it("should be check pause", async function () {
      await this.exchangeNFT.pause()
      await this.exchangeNFT.pause().should.be.rejectedWith("Pausable: paused")
      await this.exchangeNFT.connect(this.carol).buyToken(this.tokenId).should.be.rejectedWith("Pausable: paused")
      await this.exchangeNFT
        .connect(this.bob)
        .setCurrentPrice(this.tokenId, ethers.utils.parseEther("2"))
        .should.be.rejectedWith("Pausable: paused")
      await this.exchangeNFT
        .connect(this.bob)
        .readyToSellToken(this.tokenId, ethers.utils.parseEther("1"))
        .should.be.rejectedWith("Pausable: paused")
      await this.exchangeNFT.connect(this.bob).cancelSellToken(this.tokenId).should.be.rejectedWith("Pausable: paused")
      await this.exchangeNFT.unpause()
      await this.exchangeNFT.unpause().should.be.rejectedWith("Pausable: not paused")
    })
  })
})
