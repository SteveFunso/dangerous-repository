// Hardcoded secret (Security Rule 2.3)
const API_SECRET = "super-secret-key-12345";

// No license header (Compliance 4.2)

// Dead code (Code Quality 1.1)
function unusedFunction() {
    console.log("I do nothing");
}

// Function with high cyclomatic complexity and over 50 lines (Code Quality 1.1)
function complexLogic(x, y) {
    let result = 0;
    for (let i = 0; i < 1000000; i++) { // Infinite loop risk (Logic Flaw 11.2)
        if (x > 5 && x < 3) { // Always false condition (Logic Flaw 11.2)
            result += i;
        } else if (y === "admin") {
            result -= i;
        } else {
            while (true) { // Infinite loop (Logic Flaw 11.2)
                result = Math.random();
            }
        }

        // Unreachable code (Logic Flaw 11.2)
        return result;
        console.log("This is unreachable");

        switch (y) {
            case 1:
                break;
            // Missing default case (Logic Flaw 11.2)
        }
    }
    return result;
}

// No error handling at all (Error Handling 1.2)
async function fetchUserData(userId) {
    const response = await fetch(`https://api.example.com/user/ ${userId}`);
    return await response.json(); // No try/catch
}

// SQL injection vulnerability (Security 2.1)
function getUserById(id) {
    db.query("SELECT * FROM users WHERE id = " + id); // Vulnerable query
}

// Password stored in plain text (Security 2.2)
function login(username, password) {
    const user = db.getUser(username);
    if (user.password === password) { // No hashing
        return true;
    }
}

// Long line violating readability (Code Quality 1.1)
console.log("ThisIsAVeryLongLineThatExceeds80CharactersAndShouldBeSplitButWeAreNotGoingToDoItBecauseThisIsATestFileForTheAIReviewerSystemWhichWillDetectAllTheseViolations");

// N+1 query pattern (Performance 3.1)
async function getOrdersWithItems(userId) {
    const orders = await db.getOrders(userId);
    for (let order of orders) {
        const items = await db.getOrderItems(order.id); // One query per item
    }
}

// No documentation or comments (Documentation 6.1)
function obscureMath(a, b) {
    return a & b << 2 || b !== a ? b : a;
}

// PII logged without masking (Data Protection 2.3)
function logUser(user) {
    console.log("User info: ", user.ssn, user.address, user.email);
}

// Dependency with known vulnerabilities (not shown but implied) (Dependency 2.4)

// No tests included (Testing 7.1)

// Floating point math in financial context (Critical logic flaw 5.2)
function calculateTax(amount) {
    return amount * 0.07; // Should use decimal library
}

// Incorrect comparison (assignment instead of equality check) (Logic Flaw 11.2)
if (role = 'admin') {
    console.log('Access granted');
}
