import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("NFT", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.ERC721EX = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
  })

  beforeEach(async function () {
    this.nft = await this.ERC721EX.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
  })
  it("should be check role", async function () {
    expect(await this.nft.hasRole(await this.nft.ADMIN_ROLE(), this.alice.address)).to.be.true
    expect(await this.nft.getRoleAdmin(await this.nft.UPDATE_TOKEN_URI_ROLE())).equal(await this.nft.ADMIN_ROLE())
    expect(await this.nft.getRoleAdmin(await this.nft.MINT_ROLE())).equal(await this.nft.ADMIN_ROLE())
    expect(await this.nft.getRoleAdmin(await this.nft.PAUSED_ROLE())).equal(await this.nft.ADMIN_ROLE())
  })
  it("should be check mint role", async function () {
    const tokenPreId = 1111
    await this.nft.connect(this.bob).mint(this.bob.address, tokenPreId).should.be.rejectedWith("Must have mint role")
    await this.nft.connect(this.bob).safeMint(this.bob.address, tokenPreId, "0x").should.be.rejectedWith("Must have mint role")
    await this.nft.connect(this.bob).mintCard(this.bob.address, 0).should.be.rejectedWith("Must have mint role")
  })

  it("should be check mint", async function () {
    const skin = 1111
    const rarity = 2222
    const tokenPreId = ethers.BigNumber.from(skin)
      .shl(await this.cardSpec.CARD_SKIN_BIT())
      .or(ethers.BigNumber.from(rarity).shl(await this.cardSpec.CARD_RARITY_BIT()))
    const identity = tokenPreId.shr(await this.cardSpec.CARD_IDENTITY_BIT())

    await this.nft.mint(this.bob.address, tokenPreId)
    const tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
    // check number of card
    expect(await this.nft.getIdentityTokenLength(this.bob.address, identity)).equal(1)
    expect(await this.nft.getIdentityTokenAt(this.bob.address, identity, 0)).equal(tokenId)
    expect(await this.nft.totalSupply()).equal(1)
    expect(await this.nft.tokenIndex()).equal(1)

    // check token owner
    expect(await this.nft.balanceOf(this.bob.address)).equal(1)
    expect(await this.nft.ownerOf(tokenId)).equal(this.bob.address)
    // check property
    expect(await this.nft.tokenIndex()).equal(tokenId.and("0xffffffffffffffff"))
    const currentTimeStamp = Math.round(new Date(new Date().getTime() + 3600 * 1000).getTime() / 1000)
    expect(tokenId.shr(64).and("0xffffffffffffffff")).not.above(currentTimeStamp)
  })
  it("should be check safe mint", async function () {
    const skin = 1111
    const rarity = 2222
    const tokenPreId = ethers.BigNumber.from(skin)
      .shl(await this.cardSpec.CARD_SKIN_BIT())
      .or(ethers.BigNumber.from(rarity).shl(await this.cardSpec.CARD_RARITY_BIT()))
    const identity = tokenPreId.shr(await this.cardSpec.CARD_IDENTITY_BIT())

    await this.nft.safeMint(this.bob.address, tokenPreId, "0x")
    const tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
    // check number of card
    expect(await this.nft.getIdentityTokenLength(this.bob.address, identity)).equal(1)
    expect(await this.nft.getIdentityTokenAt(this.bob.address, identity, 0)).equal(tokenId)
    expect(await this.nft.totalSupply()).equal(1)
    expect(await this.nft.tokenIndex()).equal(1)

    // check token owner
    expect(await this.nft.balanceOf(this.bob.address)).equal(1)
    expect(await this.nft.ownerOf(tokenId)).equal(this.bob.address)
    // check property
    expect(await this.nft.tokenIndex()).equal(tokenId.and("0xffffffffffffffff"))
    const currentTimeStamp = Math.round(new Date(new Date().getTime() + 3600 * 1000).getTime() / 1000)
    expect(tokenId.shr(64).and("0xffffffffffffffff")).not.above(currentTimeStamp)
  })
  it("should be check mint card", async function () {
    await this.cardSpec.addCardType(1111, 2222, ethers.utils.formatBytes32String("what?"))
    const cardId = 0
    await this.nft.mintCard(this.bob.address, cardId)
    const tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
    const identity = await this.cardSpec.getIdentityFromCardId(cardId)
    expect(await this.nft.getIdentityTokenLength(this.bob.address, identity)).equal(1)
    expect(await this.nft.getIdentityTokenAt(this.bob.address, identity, 0)).equal(tokenId)
    expect(await this.nft.totalSupply()).equal(1)
    expect(await this.nft.tokenIndex()).equal(1)

    // check token owner
    expect(await this.nft.balanceOf(this.bob.address)).equal(1)
    expect(await this.nft.ownerOf(tokenId)).equal(this.bob.address)
    // check property
    expect(await this.nft.tokenIndex()).equal(tokenId.and("0xffffffffffffffff"))
    const currentTimeStamp = Math.round(new Date(new Date().getTime() + 3600 * 1000).getTime() / 1000)
    expect(tokenId.shr(64).and("0xffffffffffffffff")).not.above(currentTimeStamp)
    expect(tokenId.shr(await this.cardSpec.CARD_SKIN_BIT()).and("0xffff")).equal((await this.cardSpec.cardTypes(cardId))[0])
    expect(tokenId.shr(await this.cardSpec.CARD_RARITY_BIT()).and("0xffff")).equal((await this.cardSpec.cardTypes(cardId))[1])
  })
  context("NFT Transaction", async function () {
    beforeEach(async function () {
      await this.cardSpec.addCardType(1111, 2222, ethers.utils.formatBytes32String("what?"))
      const cardId = 0
      await this.nft.mintCard(this.bob.address, cardId)
      this.tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
      this.identity = this.tokenId.shr(await this.cardSpec.CARD_IDENTITY_BIT())
      await this.nft.grantRole(await this.nft.UPDATE_TOKEN_URI_ROLE(), this.alice.address)
    })
    it("should be check UPDATE_TOKEN_URI_ROLE", async function () {
      await this.nft
        .connect(this.bob)
        .setTokenURI(this.tokenId, (await this.cardSpec.getTokenIdentity(this.tokenId)).toString())
        .should.be.rejectedWith("Must have update token uri role")
      await this.nft.connect(this.bob).setBaseURI("http://example.com/token/").should.be.rejectedWith("Must have update token uri role")
    })
    it("should be check setBaseURI", async function () {
      expect(await this.nft.tokenURI(this.tokenId)).equal(this.identity.toString() + ".json")
      await this.nft.setBaseURI("http://example.com/token/")
      expect(await this.nft.tokenURI(this.tokenId)).equal("http://example.com/token/" + this.identity.toString() + ".json")
    })
    it("should be check setTokenURI", async function () {
      expect(await this.nft.tokenURI(this.tokenId)).equal(this.identity.toString() + ".json")
      await this.nft.setTokenURI(this.tokenId, "22221111")
      expect(await this.nft.tokenURI(this.tokenId)).equal("22221111")
    })

    it("should be check burn", async function () {
      const cardId = 0
      await this.nft.mintCard(this.bob.address, cardId)
      this.tokenId2 = await this.nft.tokenOfOwnerByIndex(this.bob.address, 1)

      expect(await this.nft.totalSupply()).equal(2)
      expect(await this.nft.balanceOf(this.bob.address)).equal(2)

      expect(await this.nft.ownerOf(this.tokenId)).equal(this.bob.address)
      expect(await this.nft.ownerOf(this.tokenId2)).equal(this.bob.address)

      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(2)

      expect(await this.nft.getIdentityTokenAt(this.bob.address, this.identity, 0)).equal(this.tokenId)
      expect(await this.nft.getIdentityTokenAt(this.bob.address, this.identity, 1)).equal(this.tokenId2)
      // check burn role
      await this.nft.burn(this.tokenId).should.be.rejectedWith("caller is not owner nor approved")
      await this.nft.connect(this.bob).burn(this.tokenId)

      // check number
      expect(await this.nft.totalSupply()).equal(1)
      expect(await this.nft.balanceOf(this.bob.address)).equal(1)
      await this.nft.ownerOf(this.tokenId).should.be.rejectedWith("ERC721: owner query for nonexistent token")
      expect(await this.nft.ownerOf(this.tokenId2)).equal(this.bob.address)

      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(1)

      expect(await this.nft.getIdentityTokenAt(this.bob.address, this.identity, 0)).equal(this.tokenId2)

      await this.nft.connect(this.bob).burn(this.tokenId2)
      expect(await this.nft.totalSupply()).equal(0)
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      await this.nft.ownerOf(this.tokenId2).should.be.rejectedWith("ERC721: owner query for nonexistent token")

      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(0)
    })
    it("should be pause", async function () {
      await this.nft.unpause().should.be.rejectedWith("Pausable: not paused")
      await this.nft.pause().should.be.rejectedWith("Must have pause role")
      await this.nft.grantRole(await this.nft.PAUSED_ROLE(), this.alice.address)

      await this.nft.pause()

      await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
      await this.nft.mint(this.bob.address, 111111).should.be.rejectedWith("ERC721Pausable: token transfer while paused")

      await this.nft.revokeRole(await this.nft.PAUSED_ROLE(), this.alice.address)
      await this.nft.unpause().should.be.rejectedWith("Must have pause role")
      await this.nft.grantRole(await this.nft.PAUSED_ROLE(), this.alice.address)
      await this.nft.unpause()
      await this.nft.mint(this.bob.address, 111111)
    })
    it("should be check approve", async function () {
      expect(await this.nft.getApproved(this.tokenId)).equal("0x0000000000000000000000000000000000000000")
      await this.nft.connect(this.bob).approve(this.alice.address, this.tokenId)
      expect(await this.nft.getApproved(this.tokenId)).equal(this.alice.address)
    })

    it("should be check transfer", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(1)
      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(1)
      expect(await this.nft.getIdentityTokenAt(this.bob.address, this.identity, 0)).equal(this.tokenId)
      expect(await this.nft.getIdentityTokenLength(this.carol.address, this.identity)).equal(0)
      await this.nft
        .connect(this.bob)
        .transferFrom(this.bob.address, this.carol.address, 111111)
        .should.be.rejectedWith("ERC721: operator query for nonexistent token")
      await this.nft.connect(this.bob).transferFrom(this.bob.address, this.carol.address, this.tokenId)
      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(0)
      expect(await this.nft.getIdentityTokenLength(this.carol.address, this.identity)).equal(1)

      expect(await this.nft.getIdentityTokenAt(this.carol.address, this.identity, 0)).equal(this.tokenId)

      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      expect(await this.nft.balanceOf(this.carol.address)).equal(1)
      expect(await this.nft.totalSupply()).equal(1)
    })

    it("should be check transferfrom", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(1)
      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(1)
      expect(await this.nft.getIdentityTokenAt(this.bob.address, this.identity, 0)).equal(this.tokenId)
      expect(await this.nft.getIdentityTokenLength(this.carol.address, this.identity)).equal(0)
      this.nft
        .connect(this.carol)
        .transferFrom(this.bob.address, this.carol.address, this.tokenId)
        .should.be.rejectedWith("caller is not owner nor approved")
      expect(await this.nft.getApproved(this.tokenId)).equal("0x0000000000000000000000000000000000000000")
      await this.nft.connect(this.bob).approve(this.carol.address, this.tokenId)
      expect(await this.nft.getApproved(this.tokenId)).equal(this.carol.address)
      await this.nft.connect(this.carol).transferFrom(this.bob.address, this.carol.address, this.tokenId)
      expect(await this.nft.getIdentityTokenLength(this.bob.address, this.identity)).equal(0)
      expect(await this.nft.getIdentityTokenLength(this.carol.address, this.identity)).equal(1)
      expect(await this.nft.getIdentityTokenAt(this.carol.address, this.identity, 0)).equal(this.tokenId)

      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      expect(await this.nft.balanceOf(this.carol.address)).equal(1)
      expect(await this.nft.totalSupply()).equal(1)
    })

    it("should be approveBulk", async function () {
      const cardId = 0
      await this.nft.mintCard(this.carol.address, cardId)
      await this.nft.mintCard(this.carol.address, cardId)
      const tokenId0 = await this.nft.tokenOfOwnerByIndex(this.carol.address, 0)
      const tokenId1 = await this.nft.tokenOfOwnerByIndex(this.carol.address, 1)

      expect(await this.nft.getApproved(tokenId0)).equal("0x0000000000000000000000000000000000000000")
      expect(await this.nft.getApproved(tokenId1)).equal("0x0000000000000000000000000000000000000000")
      expect(await this.nft.getApprovedBulk([tokenId0, tokenId1])).eql([
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
      ])
      await this.nft.connect(this.carol).approveBulk(this.dave.address, [tokenId0, tokenId1])
      expect(await this.nft.getApproved(tokenId0)).equal(this.dave.address)
      expect(await this.nft.getApproved(tokenId1)).equal(this.dave.address)
      expect(await this.nft.getApprovedBulk([tokenId0, tokenId1])).to.have.lengthOf(2)
      expect(await this.nft.getApprovedBulk([tokenId0, tokenId1])).eql([this.dave.address, this.dave.address])
    })
  })
})
