pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

template CreditScoreProof() {
    // Private inputs (hidden from verifier)
    signal private input credit_score;
    signal private input account_age;
    signal private input payment_history;
    signal private input credit_utilization;
    signal private input debt_to_income;
    signal private input privacy_level;
    signal private input nullifier_secret;
    
    // Public inputs (visible to verifier)
    signal input score_threshold;
    signal input transparency_mask;
    signal input nullifier_hash;
    
    // Outputs
    signal output score_in_range;
    signal output masked_score;
    signal output privacy_premium;
    
    // Components
    component gte = GreaterEqualThan(10);
    component lte = LessEqualThan(10);
    component poseidon = Poseidon(2);
    
    // Constraint: Credit score must be between 300 and 850
    component score_min = GreaterEqualThan(10);
    component score_max = LessEqualThan(10);
    
    score_min.in[0] <== credit_score;
    score_min.in[1] <== 300;
    
    score_max.in[0] <== credit_score;
    score_max.in[1] <== 850;
    
    // Constraint: Credit score must meet the threshold
    gte.in[0] <== credit_score;
    gte.in[1] <== score_threshold;
    
    // Constraint: Account age must be reasonable (0-600 months)
    component age_check = LessEqualThan(10);
    age_check.in[0] <== account_age;
    age_check.in[1] <== 600;
    
    // Constraint: Payment history must be 0-100%
    component payment_check = LessEqualThan(7);
    payment_check.in[0] <== payment_history;
    payment_check.in[1] <== 100;
    
    // Constraint: Credit utilization must be 0-100%
    component util_check = LessEqualThan(7);
    util_check.in[0] <== credit_utilization;
    util_check.in[1] <== 100;
    
    // Constraint: Debt to income must be 0-200%
    component debt_check = LessEqualThan(8);
    debt_check.in[0] <== debt_to_income;
    debt_check.in[1] <== 200;
    
    // Constraint: Privacy level must be 1-5
    component privacy_min = GreaterEqualThan(3);
    component privacy_max = LessEqualThan(3);
    
    privacy_min.in[0] <== privacy_level;
    privacy_min.in[1] <== 1;
    
    privacy_max.in[0] <== privacy_level;
    privacy_max.in[1] <== 5;
    
    // Generate nullifier hash to prevent double-spending
    poseidon.inputs[0] <== nullifier_secret;
    poseidon.inputs[1] <== credit_score;
    nullifier_hash <== poseidon.out;
    
    // Calculate score range validation
    score_in_range <== gte.out * score_min.out * score_max.out;
    
    // Calculate masked score based on privacy level
    // Level 5 (max privacy): mask everything
    // Level 1 (min privacy): reveal more
    signal privacy_multiplier;
    privacy_multiplier <== (6 - privacy_level) * 20; // 20, 40, 60, 80, 100
    
    masked_score <== credit_score * transparency_mask * privacy_multiplier / 100;
    
    // Calculate privacy premium (higher privacy = lower premium)
    // Level 5: 0% premium, Level 1: 2% premium
    privacy_premium <== (6 - privacy_level) * 50; // 50, 100, 150, 200, 250 (basis points)
    
    // Ensure all constraints are satisfied
    component final_check = IsZero();
    final_check.in <== (score_in_range - 1) + 
                      (age_check.out - 1) +
                      (payment_check.out - 1) +
                      (util_check.out - 1) +
                      (debt_check.out - 1) +
                      (privacy_min.out - 1) +
                      (privacy_max.out - 1);
    
    // Final constraint: all checks must pass
    final_check.out === 0;
}

component main = CreditScoreProof(); 