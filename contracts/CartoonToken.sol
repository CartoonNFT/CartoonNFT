// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;

import '@openzeppelin/contracts/token/ERC20/ERC20Capped.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract CartoonToken is ERC20Capped, AccessControl {
    bytes32 public constant MINT_ROLE = keccak256('MINT_ROLE');
    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

    constructor(address _dev) ERC20('CartoonToken', 'CTO') ERC20Capped(130000000 * 10**18) {
        _setupRole(ADMIN_ROLE, _dev);
        _setRoleAdmin(MINT_ROLE, ADMIN_ROLE);
    }

    function mint(address to, uint256 amount) public {
        require(hasRole(MINT_ROLE, _msgSender()), 'Must have mint role');
        _mint(to, amount);
    }
}
