// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../CreditScoring.sol";

/**
 * @title MaliciousReentrancyAttacker
 * @dev Contract that attempts reentrancy attacks on CreditScoring contract
 * Used for testing reentrancy protection
 */
contract MaliciousReentrancyAttacker {
    CreditScoring public creditScoring;
    uint256 public attackCount;
    bool public isAttacking;

    constructor(address _creditScoring) {
        creditScoring = CreditScoring(_creditScoring);
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (isAttacking && attackCount < 3) {
            attackCount++;
            // Try to withdraw again during the same transaction
            creditScoring.withdrawStake(0.1 ether);
        }
    }

    function attack() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        creditScoring.withdrawStake(0.1 ether);
        
        isAttacking = false;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title MaliciousLendingAttacker
 * @dev Contract that attempts reentrancy attacks on CreditLending contract
 */
contract MaliciousLendingAttacker {
    address public lendingContract;
    uint256 public attackCount;
    bool public isAttacking;

    constructor(address _lendingContract) {
        lendingContract = _lendingContract;
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (isAttacking && attackCount < 3) {
            attackCount++;
            // Try to withdraw again during the same transaction
            (bool success, ) = lendingContract.call(
                abi.encodeWithSignature("unstakeETH(uint256)", 0.1 ether)
            );
            if (!success) {
                // Try alternative withdrawal method
                (success, ) = lendingContract.call(
                    abi.encodeWithSignature("withdrawFromPool(uint256)", 0.1 ether)
                );
            }
        }
    }

    function attackUnstake() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        (bool success, ) = lendingContract.call(
            abi.encodeWithSignature("unstakeETH(uint256)", 0.1 ether)
        );
        require(success, "Initial call failed");
        
        isAttacking = false;
    }

    function attackWithdraw() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        (bool success, ) = lendingContract.call(
            abi.encodeWithSignature("withdrawFromPool(uint256)", 0.1 ether)
        );
        require(success, "Initial call failed");
        
        isAttacking = false;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title MaliciousZKLendingAttacker
 * @dev Contract that attempts reentrancy attacks on ZKCreditLending contract
 */
contract MaliciousZKLendingAttacker {
    address public zkLendingContract;
    uint256 public attackCount;
    bool public isAttacking;

    constructor(address _zkLendingContract) {
        zkLendingContract = _zkLendingContract;
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (isAttacking && attackCount < 3) {
            attackCount++;
            // Try to withdraw again during the same transaction
            (bool success, ) = zkLendingContract.call(
                abi.encodeWithSignature("unstakeETH(uint256)", 0.1 ether)
            );
            if (!success) {
                // Try alternative withdrawal method
                (success, ) = zkLendingContract.call(
                    abi.encodeWithSignature("withdrawFromPool(uint256)", 0.1 ether)
                );
            }
        }
    }

    function attackUnstake() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        (bool success, ) = zkLendingContract.call(
            abi.encodeWithSignature("unstakeETH(uint256)", 0.1 ether)
        );
        require(success, "Initial call failed");
        
        isAttacking = false;
    }

    function attackWithdraw() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        (bool success, ) = zkLendingContract.call(
            abi.encodeWithSignature("withdrawFromPool(uint256)", 0.1 ether)
        );
        require(success, "Initial call failed");
        
        isAttacking = false;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title MaliciousZKScoringAttacker
 * @dev Contract that attempts reentrancy attacks on ZKCreditScoring contract
 */
contract MaliciousZKScoringAttacker {
    address public zkScoringContract;
    uint256 public attackCount;
    bool public isAttacking;

    constructor(address _zkScoringContract) {
        zkScoringContract = _zkScoringContract;
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (isAttacking && attackCount < 3) {
            attackCount++;
            // Try to withdraw again during the same transaction
            (bool success, ) = zkScoringContract.call(
                abi.encodeWithSignature("withdrawStake(uint256)", 0.1 ether)
            );
        }
    }

    function attack() external {
        isAttacking = true;
        attackCount = 0;
        
        // Initial withdrawal that should trigger reentrancy
        (bool success, ) = zkScoringContract.call(
            abi.encodeWithSignature("withdrawStake(uint256)", 0.1 ether)
        );
        require(success, "Initial call failed");
        
        isAttacking = false;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}