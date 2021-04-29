// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';

import './CardSpec.sol';

contract ERC721Ex is ERC721Pausable, AccessControl {
    using SafeMath for uint256;
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant UPDATE_TOKEN_URI_ROLE = keccak256('UPDATE_TOKEN_URI_ROLE');
    bytes32 public constant MINT_ROLE = keccak256('MINT_ROLE');
    bytes32 public constant PAUSED_ROLE = keccak256('PAUSED_ROLE');
    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

    uint256 public tokenIndex;
    CardSpec public spec;

    // from -> identity -> tokens
    mapping(address => mapping(uint256 => EnumerableSet.UintSet)) IdentityTokens;

    constructor(CardSpec _spec, address _dev) ERC721('non-fungible Cartoon Token', 'NCTO') {
        spec = _spec;
        _setupRole(ADMIN_ROLE, _dev);
        _setRoleAdmin(UPDATE_TOKEN_URI_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MINT_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSED_ROLE, ADMIN_ROLE);
    }

    // safe mint to someone
    function safeMint(
        address to,
        uint256 tokenPreId,
        bytes memory _data
    ) public returns (uint256 tokenId) {
        require(hasRole(MINT_ROLE, _msgSender()), 'Must have mint role');
        tokenId = tokenPreId | (uint256(uint40(block.timestamp)) << 64) | uint64(++tokenIndex);
        _safeMint(to, tokenId, _data);
    }

    // mint to someone
    function mint(address to, uint256 tokenPreId) public returns (uint256 tokenId) {
        require(hasRole(MINT_ROLE, _msgSender()), 'Must have mint role');
        tokenId = tokenPreId | (uint256(uint40(block.timestamp)) << 64) | uint64(++tokenIndex);
        _mint(to, tokenId);
    }

    function mintCard(address to, uint256 cardId) public returns (uint256 tokenId) {
        require(hasRole(MINT_ROLE, _msgSender()), 'Must have mint role');
        (uint16 skin, uint16 rarity, ) = spec.cardTypes(cardId);
        tokenId =
            (uint256(spec.NFT_SIGN()) << spec.NFT_SIGN_BIT()) |
            (uint256(skin) << spec.CARD_SKIN_BIT()) |
            (uint256(rarity) << spec.CARD_RARITY_BIT()) |
            (uint256(uint40(block.timestamp)) << 64) |
            uint64(++tokenIndex);
        _mint(to, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked(uint256(tokenId >> spec.CARD_IDENTITY_PADDING_BIT()).toString(), '.json')));
    }

    // burn token
    function burn(uint256 tokenId) public {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), 'caller is not owner nor approved');
        _burn(tokenId);
    }

    function setBaseURI(string memory baseURI) public {
        require(hasRole(UPDATE_TOKEN_URI_ROLE, _msgSender()), 'Must have update token uri role');
        _setBaseURI(baseURI);
    }

    function setTokenURI(uint256 tokenId, string memory tokenURI) public {
        require(hasRole(UPDATE_TOKEN_URI_ROLE, _msgSender()), 'Must have update token uri role');
        _setTokenURI(tokenId, tokenURI);
    }

    function pause() public whenNotPaused {
        require(hasRole(PAUSED_ROLE, _msgSender()), 'Must have pause role');
        _pause();
    }

    function unpause() public whenPaused {
        require(hasRole(PAUSED_ROLE, _msgSender()), 'Must have pause role');
        _unpause();
    }

    function approveBulk(address to, uint256[] memory tokenIds) public {
        for (uint256 i; i < tokenIds.length; ++i) {
            approve(to, tokenIds[i]);
        }
    }

    function getApprovedBulk(uint256[] memory tokenIds) public view returns (address[] memory) {
        address[] memory tokenApprovals = new address[](tokenIds.length);
        for (uint256 i; i < tokenIds.length; ++i) {
            tokenApprovals[i] = getApproved(tokenIds[i]);
        }
        return tokenApprovals;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
        uint256 identity = spec.getTokenIdentity(tokenId);
        if (from != address(0)) {
            IdentityTokens[from][identity].remove(tokenId);
        }
        if (to != address(0)) {
            IdentityTokens[to][identity].add(tokenId);
        }
    }

    function getIdentityTokenAt(
        address from,
        uint256 identity,
        uint256 index
    ) public view returns (uint256) {
        return IdentityTokens[from][identity].at(index);
    }

    function getIdentityTokenLength(address from, uint256 identity) public view returns (uint256) {
        return IdentityTokens[from][identity].length();
    }
}
