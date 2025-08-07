## **System Design & Development Charter for AI Development Agents**

This charter establishes the fundamental principles for continuously developing maintainable and scalable applications, minimizing future technical debt. AI agents must strictly adhere to the following rules in all coding, feature additions, and refactoring.

### **Top-Level Principles**

- The AI's internal thought process for analysis and strategy must be in English. However, explanations of the implementation plan, along with all other external responses and documentation, must be provided in Japanese.
- Review this entire development charter and process all tasks according to it.
- If any points are unclear, always seek clarification _before_ starting work.
- Upon agent startup, read the entirety of `Rule_of_coding.md` and display all top-level principles in the chat.
- Upon completion of all tasks, check for any violations of these principles, get confirmation, then update README.md and `git add`, `commit`, and `push` to GitHub.
- Upon completion of every task, reflect on any bugs or issues that occurred. Conduct a self-review asking, "Why did this happen?" and "Could it have been prevented by following the development charter?". If necessary, propose improvements to the charter itself to enhance quality in the future.

### **Risk-Based Approach: Balancing Development Speed and Quality**

Optimize the balance between development speed and quality by adjusting the rigor of procedures based on the **impact and risk** of the changes, rather than applying the same strictness to all modifications.

#### **High-Risk Changes: Strict Application of All Charter Rules**

- **Scope**: Changes with a wide-ranging impact, such as core logic, shared modules, configuration files, authentication systems, and database schemas.
- **Applicable Rules**: Strictly apply all rules in this charter, especially impact analysis, test-driven development, gradual migration, and documentation updates.
- **Process**: Requires prior impact analysis, test creation, a gradual migration plan, and detailed documentation updates.

#### **Medium-Risk Changes: Adherence to Fundamental Principles**

- **Scope**: Bug fixes in existing features, logic improvements within a single API endpoint, and functional enhancements to existing services.
- **Applicable Rules**: Adhere to the fundamental principles of "Protect Production Features," "Thorough Testing," and "Differential Review."
- **Process**: Requires impact assessment, execution of relevant tests, and documentation updates.

#### **Low-Risk Changes: Lightweight Process**

- **Scope**: Non-logic changes such as UI text corrections, minor CSS adjustments, adding comments, or minor logging changes.
- **Applicable Rules**: Basic quality checks only.
- **Process**: Use `git status` and `git diff` to confirm the scope of changes, then commit directly after a self-review. A pull request is optional or can be reported post-commit.

### **Standardized Development Process: Achieving Both Quality and Efficiency**

Execute high- and medium-risk development tasks according to the following 6-step process:

1.  **Analyze & Plan**: Analyze requirements in detail to clarify the implementation strategy and impact scope.
2.  **Preliminary Discussion**: Review the implementation plan to ensure it complies with this development charter.
3.  **Finalize Strategy**: Determine the final improvement strategy based on user feedback.
4.  **Incremental Implementation**: Implement in small, manageable units, testing at each stage.
5.  **Isolate & Fix Problems**: Systematically analyze issues found during testing, verify with logs to identify root causes, and fix them.
6.  **Review & Improve**: After completion, analyze any problems that occurred and consider improvements to this charter.

#### **Mandatory Testing Requirements for All Development**

For all code changes (regardless of risk level), the following testing protocol must be executed:

**Pre-Modification Testing (Before Implementation)**

- Execute existing tests for the target component/module: `npx vitest run path/to/target.test.tsx --reporter=default --no-color > pre-modification-test.log 2>&1`
- Document current test success rate and identify any pre-existing failures
- If no tests exist, create basic test coverage before implementing changes

**Post-Modification Testing (After Implementation)**

- Re-execute the same test suite: `npx vitest run path/to/target.test.tsx --reporter=default --no-color > post-modification-test.log 2>&1`
- Compare pre/post results to ensure no functional regression
- All previously passing tests must continue to pass
- New functionality must have corresponding test coverage

**Test Log Verification Protocol (Mandatory - 効率化対応)**

After every test execution, follow this verification protocol to ensure complete log capture:

1. **Execution Confirmation**: Display `echo "ログファイルを確認"` before checking log files
2. **Log File Existence**: Verify the log file was created: `Test-Path "logfile.log"`
3. **Log File Completeness**: Check log file size and content validity: `Get-Content "logfile.log" | Select-Object -First 10 -Last 10`
4. **Test Result Extraction**: Parse and document test success/failure counts from log
5. **Missing Output Investigation**: If log is incomplete, re-execute with alternative capture methods

**テスト実行戦略（エラー多数時の効率化）**

エラーが多い場合や CI 環境では、以下の段階的アプローチを採用する：

```powershell
# Stage 1: 高速サマリーチェック（30秒以内）
npx vitest run --reporter=basic --no-color --silent --bail=5 > quick-test.log 2>&1
$quickResult = Get-Content "quick-test.log" | Select-String "passed|failed|error"
Write-Host "クイックテスト結果: $quickResult"

# Stage 2: エラーのみ詳細調査（必要時のみ）
if ($quickResult -match "failed|error") {
    npx vitest run --reporter=verbose --no-color --reporter.outputFile=error-details.log 2>&1 |
        Select-String "✗|FAIL|Error|TypeError" |
        Select-Object -First 20 |
        Out-File -FilePath "filtered-errors.log" -Encoding UTF8
    Write-Host "エラー詳細ログ: filtered-errors.log"
}

# Stage 3: 完全テスト（最終確認時のみ）
# npx vitest run --reporter=verbose --no-color > full-test.log 2>&1
```

**実際の使用例（文字化け・時間短縮対策）**

```powershell
# 1. 高速サマリーテスト（推奨 - 30秒以内）
.\run-efficient-test.ps1 -TestPath "src/components/ErrorBoundary.test.tsx" -Mode "summary"

# 2. エラー専用調査（問題が多い場合）
.\run-efficient-test.ps1 -TestPath "src/components/ErrorBoundary.test.tsx" -Mode "error"

# 3. 詳細調査（必要時のみ）
.\run-efficient-test.ps1 -TestPath "src/components/ErrorBoundary.test.tsx" -Mode "detail"

# 4. 全体テスト（リリース前チェック）
.\run-efficient-test.ps1 -Mode "summary"
```

**テスト結果の例**

```
=== Efficient Test Execution Start ===
Mode: error, Component: ErrorBoundary, Time: 20250807-210617
Running error-focused test...
=== Error Details ===
× ErrorBoundary > catches errors and displays error UI 36ms
→ Element type is invalid: expected a string (for built-in components)
  but got: undefined. Check the render method of ErrorBoundary.
Summary: Passed=7, Failed=8
Error log: ErrorBoundary-20250807-210617-error-test.log
```

**改善効果**

- ⚡ テスト時間: 従来の 1/3 に短縮（エラー多数時）
- 🔤 文字化け: 完全解決（UTF-8 対応）
- 📊 結果視認性: エラー内容が明確に判別可能
- 🧹 ログ管理: 自動クリーンアップで容量効率化

**PowerShell Log Capture Best Practices (文字化け対策)**

For Windows PowerShell environments, use these proven methods in order of preference:

```powershell
# Method 1: 高速サマリーテスト（推奨 - エラー多数時の時間短縮）
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "test-summary-$timestamp.log"
npx vitest run --reporter=basic --no-color --silent > $logFile 2>&1
echo "ログファイルを確認"
if (Test-Path $logFile) {
    Write-Host "=== テスト結果サマリー ===" -ForegroundColor Green
    Get-Content $logFile | Select-String "✓|✗|PASS|FAIL|Error|passed|failed" | Select-Object -First 20
    Write-Host "詳細ログ: $logFile" -ForegroundColor Yellow
}

# Method 2: UTF8エンコーディング対応（文字化け対策）
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "test-detail-$timestamp.log"
npx vitest run path/to/target.test.tsx --reporter=verbose --no-color --run 2>&1 |
    ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::Default.GetBytes($_)) } |
    Out-File -FilePath $logFile -Encoding UTF8

# Method 3: エラー専用フィルター（問題調査時）
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$errorLog = "test-errors-$timestamp.log"
npx vitest run --reporter=default --no-color 2>&1 |
    Select-String "✗|FAIL|Error|failed|TypeError|ReferenceError" |
    Out-File -FilePath $errorLog -Encoding UTF8
echo "ログファイルを確認"
if (Test-Path $errorLog) {
    Write-Host "=== エラー詳細 ===" -ForegroundColor Red
    Get-Content $errorLog | Select-Object -First 15
}

# Method 4: テスト実行時間短縮（CI/継続的統合用）
npx vitest run --reporter=json --no-color > test-results.json 2>&1
if (Test-Path "test-results.json") {
    $results = Get-Content "test-results.json" | ConvertFrom-Json
    Write-Host "総テスト数: $($results.numTotalTests)" -ForegroundColor Blue
    Write-Host "成功: $($results.numPassedTests)" -ForegroundColor Green
    Write-Host "失敗: $($results.numFailedTests)" -ForegroundColor Red
    Write-Host "実行時間: $($results.testResults.endTime - $results.testResults.startTime)ms" -ForegroundColor Yellow
}
```

**Test Construction for Untested Code**
When encountering code without adequate test coverage:

1. **Risk Assessment**: Evaluate the criticality of the untested component
2. **Baseline Test Creation**: Implement basic functionality tests before any modifications
3. **Edge Case Coverage**: Add tests for error conditions and boundary values
4. **Integration Verification**: Ensure component interactions are properly tested

**Test Log Management (効率化・文字化け対策)**

- Save all test results with descriptive filenames: `{component}-{timestamp}-{summary|detail|error}-test.log`
- Use staged logging approach for efficiency:
  - `summary` logs: Basic pass/fail counts (< 100KB)
  - `detail` logs: Full test output when needed (< 5MB)
  - `error` logs: Filtered error information only (< 1MB)
- Archive test logs for audit trails and regression analysis
- Clean up temporary logs after verification using PowerShell-compatible commands:

```powershell
# Windows PowerShell log cleanup（効率化対応）
# 段階的クリーンアップ: サマリーログは7日、詳細ログは1日保持
Get-ChildItem *-summary-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item
Get-ChildItem *-detail-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-1)} | Remove-Item
Get-ChildItem *-error-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-3)} | Remove-Item

# 大容量ログファイルの自動削除（5MB以上）
Get-ChildItem *.log | Where-Object {$_.Length -gt 5MB -and $_.LastWriteTime -lt (Get-Date).AddHours(-6)} | Remove-Item

# Manual cleanup after test verification
Remove-Item *-test.log -Exclude "*$(Get-Date -Format 'yyyyMMdd')*"
```

**Cross-Platform Log Cleanup Alternatives**

```bash
# Unix/Linux/macOS
find . -name "*.log" -type f -mtime +7 -delete

# Windows Command Prompt
forfiles /p . /m *.log /d -7 /c "cmd /c del @path"
```

---

### **I. Core Design Principles: The Foundation of All Code**

1.  **Strictly Enforce the Single Responsibility Principle (SRP)**

    - **Do**: Assign only one clear responsibility to a single class or function. Avoid mixing multiple responsibilities like API communication, data processing, and UI updates. Watch for signs of excessive responsibility (e.g., a class exceeding 500 lines of code).

2.  **Prioritize Separation of Concerns (SoC)**

    - **Do**: Clearly divide the application into distinct layers with different concerns, such as the Presentation Layer (UI), Business Logic Layer (Service), and Data Access Layer (Repository). Strictly adhere to the responsibilities of each layer (e.g., do not write data access logic in the presentation layer).

3.  **Adhere to the Don't Repeat Yourself (DRY) Principle**

    - **Do**: If the same block of code appears in multiple places, refactor it into a reusable function or class. Avoid copy-pasting code, as it creates a breeding ground for future maintenance issues and bugs.

4.  **Separate Configuration from Logic**

    - **Do**: Manage configuration values like database credentials, API keys, and environment variables in dedicated configuration files (e.g., `.env`, `config.py`). Do not hardcode environment-dependent values in the source code.

5.  **Ensure Consistency Across All Related Components When Making Changes**
    - **Do**: When performing a feature change or refactoring, identify all affected areas (logic, database schema, API definitions, test code) and ensure that they are all consistent within a single commit.

---

### **II. Frontend Conventions: Balancing User Experience and Maintainability**

6.  **Build the UI with a Component-Based Architecture**

    - **Do**: Design the UI as a collection of reusable, independent components. Elements like sidebars, results tables, and button groups should each be a self-contained component.

7.  **Centralize State Management**

    - **Do**: Manage state shared across the entire application (e.g., user info, data from APIs) in a single store. State changes must go through a defined process (e.g., Actions, Mutations). Components should focus solely on receiving state from the store and rendering it.

8.  **Encapsulate UI State Within Components**

    - **Do**: Keep UI display state (e.g., modal visibility, selected tab) within the component that manages it whenever possible.

9.  **Separate Business Logic from DOM Manipulation**

    - **Do**: Confine code that directly manipulates the DOM to dedicated UI services or components. Business logic should only be concerned with "updating data." Strive for a data-driven design where a UI service detects data changes and re-renders the view.

10. **Actively Utilize Client-Side Caching to Improve Perceived Speed and Reduce Server Load**

    - **Do**: Use browser caching mechanisms like `sessionStorage` or `localStorage` for frequently accessed data that doesn't require real-time updates (e.g., operation history, master data). The default architecture should be to display data from the cache on page load and fetch the latest data from the server only upon explicit user action (e.g., a "Refresh" button).

11. **Prioritize Usability in All Design Decisions**

    - **Do**:
      - Error messages must be specific, understandable, and include a solution (e.g., "WHERE clause is required...").
      - Do not display success messages if the success is visually obvious to the user.
      - Use gentle colors for notifications; use pale colors for errors.
      - Notifications should be immediately dismissible to avoid unnecessary delays.
      - Provide clear visual feedback for user actions.

12. **Determine Component Placement Based on Its Role**

    - **Do**: When creating a new component, ask "Can this part be reused on other screens?" and decide its location based on the following criteria:
      - **`components/`**: For reusable, generic parts (UI-focused, independent of business logic). (e.g., `Button`, `Input`, `Modal`, `Table`)
      - **`features/`**: For components that combine parts from `components/` and integrate with the state (store) to implement a specific feature. (e.g., `UserList`, `ResultsDisplay`)

13. **Components Must Subscribe Only to the Minimum Necessary Stores**
    - **Do**: When a component references state, it should only receive the minimum data necessary for its job. Avoid casually using a Facade store; as a rule, use specific stores directly to prevent performance degradation.

---

### **III. Backend Conventions: Ensuring Robustness and Scalability**

14. **Enforce Dependency Injection (DI) to Keep Layers Loosely Coupled**

    - **Do**: Higher-level layers should depend on abstractions (interfaces or base classes), not on concrete implementations of lower-level layers. Inject dependencies from the outside via constructors or framework features like FastAPI's `Depends`.

15. **Strictly Define the Responsibilities of Services**

    - **Do**:
      - **API Layer (Controller/Router)**: Solely responsible for receiving HTTP requests, performing validation, calling the appropriate Service, and returning the result as an HTTP response.
      - **Business Logic Layer (Service)**: Implements application-specific rules and data processing flows.
      - **Data Access Layer (Repository/DAO)**: Handles the specific interactions with databases or external APIs.

16. **Organize Modules by Feature**

    - **Do**: To prevent files like `routes.py` from becoming bloated, split related API endpoints into feature-specific files using `APIRouter` (e.g., `user_routes.py`, `template_routes.py`). Do the same for Services and Repositories.

17. **Abstract Business Logic with a Coordinating Service (Facade)**

    - **Do**: If a single business operation requires calling multiple lower-level services, create a higher-level service (e.g., `AdminService`) to orchestrate them. The API layer should depend only on this coordinating service, and complex process flows should be implemented as business logic within this service, not in the API route function.

18. **Log with Intent, Being Mindful of Levels and Purpose**
    - **Do**: Use log levels (INFO, DEBUG, etc.) based on who needs the information and when. Functions should return results, and the decision to log should be delegated to the caller (usually the top-level service). Avoid indiscriminate INFO logging from every layer.
      - **INFO**: To mark the start and completion of major business-level operations.
      - **DEBUG**: For developers to trace the flow of execution, showing specific internal system steps.

---

### **IV. Testing and Quality Conventions: Helping Your Future Self**

19. **Design for Testability**

    - **Do**: Design functions to be as pure as possible, with no side effects. Ensure class dependencies can be injected from the outside so they can be easily replaced with mocks during testing.

20. **Apply the DRY Principle to Test Code**

    - **Do**: Consolidate common setup logic in tests (e.g., creating test data, mocking DB connections) into shared utilities provided by the testing framework (e.g., `pytest` fixtures).

21. **Ensure Safe Fallbacks and User Confirmation for Exceptions/Errors**

    - **Do**: Guarantee safe default behavior even in abnormal situations, such as a corrupted configuration or an empty database. If the behavior for an error or exception is unclear, always confirm the desired course of action with the user.

22. **Mandatory Testing After All Code Changes**
    - **Do**: Execute relevant tests immediately after any code modification to ensure functionality integrity. Refer to `TESTING_STRATEGY.md` for comprehensive testing guidelines and current test status.
    - **Required Test Types**:
      - **Unit Tests**: For individual functions, components, and store logic
      - **Integration Tests**: For component interactions and API communications
      - **Regression Tests**: For previously working functionality after changes
    - **Test Execution Requirements**:
      - Run `npm test -- [affected-component]` for targeted testing
      - Run `npm run test:coverage` to ensure coverage standards (minimum 70% for new code)
      - Fix failing tests before proceeding with new development
      - Update test cases when modifying existing functionality
    - **Documentation**: Maintain test documentation in `TESTING_STRATEGY.md` with current test status, known issues, and improvement plans.

---

### **V. Refactoring Conventions: For Safe Code Evolution**

23. **The Absolute Protection of Production Features is the Top Priority**

    - **Do**: Conduct refactoring while ensuring that existing production functionality remains completely intact. Mocks and temporary implementations must be strictly isolated within test code and must not alter the behavior of production code.

24. **Guarantee Behavior with Tests**

    - **Do**: Before refactoring, create or verify tests that cover the target behavior. After refactoring, confirm that all of these tests pass.

25. **Thoroughly Identify and Manage the Scope of Impact**

    - **Do**: Before starting a change, identify every location where the target class, function, or variable is referenced (including in test code) and modify them consistently.

26. **Make Changes Small and Incremental**

    - **Do**: Break down large refactorings into smaller, meaningful units. Use separate commits or pull requests for each step. Verify and review at each stage.

27. **Plan for Gradual Migration with Backward Compatibility**

    - **Do**: When replacing an existing feature (API, class, etc.), first add the new feature and allow both to operate in parallel. Deprecate the old feature only after confirming that all callers have migrated to the new one.

28. **Maintain Environment Compatibility When Changing Settings**

    - **Do**: When changing configuration classes or environment variables, ensure the system can still start without errors using existing `.env` files. Use aliases or default values to maintain compatibility. Do not forget to update `env.example`.

29. **Clearly Document the Intent and Result of Changes**

    - **Do**: Clearly describe _why_ the refactoring was necessary and _what_ changes were made in commit messages, pull requests, and related documentation. Avoid vague messages like "Fixed."

30. **Roll Back Immediately if Anomalies Occur**

    - **Do**: If an unexpected error occurs or a test fails during refactoring, immediately stop the work and revert the changes (roll back). Investigate the cause calmly afterward.

31. **Avoid Temporary Fixes; Prioritize Fundamental Solutions Through Abstraction**

    - **Do**: When faced with failures or limitations of external services (databases, APIs, etc.), do not implement temporary workarounds with dummy data or stubs. Instead, confirm the desired handling with the user. Do not adopt temporary solutions that create technical debt.

32. **Design Principles for Abstraction Layers**
    - **Do**:
      - **Interface Segregation**: Always abstract external dependencies (DB, APIs, etc.) with interfaces, making concrete implementations injectable.
      - **Configuration-Driven**: Control behavior with environment variables or config files to allow switching without code changes.
      - **Gradual Migration**: Allow new implementations to run in parallel with existing ones for a phased transition.
      - **Fault Isolation**: Establish proper boundaries so that a failure in one external dependency does not affect other features.

### **VI. React-Specific Development Conventions**

33. **Enforce Single Source of Truth for State Management**

    - **Do**: Never create duplicate state management logic for the same data. If multiple files manage the same state (e.g., template preferences), consolidate them into a single Provider or Context.
    - **Don't**: Implement the same API call or state update logic in multiple files like `TemplateProvider.tsx` and `TemplateContext.tsx`.

34. **Ensure Type Safety in State Updates**

    - **Do**: When mapping data for API calls, ensure all required fields are properly typed and mapped. Use direct property access instead of dynamic field checking.
    - **Example**: Use `template.type` directly instead of `'type' in template ? template.type : 'user'`.

35. **Handle Async State Updates Correctly**

    - **Do**: When updating state that immediately needs to be sent to an API, either:
      - Pass the new data directly to the API call function
      - Wait for state update completion before API call
      - Use callback-based state updates
    - **Don't**: Call API functions immediately after state updates without ensuring the state has been updated.

36. **Maintain Component Pattern Consistency**

    - **Do**: When implementing similar UI patterns (like popovers, modals, tooltips), use the same implementation approach across all components.
    - **Do**: Create reusable hook patterns for common UI behaviors and reference existing implementations before creating new ones.

---

## **Universal Testing Strategy: Principles for Any System Development**

The following testing principles and practices are applicable to any software development project, regardless of technology stack or domain.

### **📋 Test Log Management Strategy**

#### **Log File Creation and Organization**

```bash
# Universal test execution with comprehensive logging
{test_runner} {test_target} --reporter=verbose > test-{component}-{timestamp}.log 2>&1

# Example implementations:
# Jest: npm test component.test.js > test-component-20250805.log 2>&1
# Vitest: npx vitest run component.test.tsx > test-component-20250805.log 2>&1
# Pytest: python -m pytest test_module.py > test-module-20250805.log 2>&1
# Go: go test ./... > test-all-20250805.log 2>&1
```

#### **Cross-Platform Log Cleanup**

```bash
# Unix/Linux/macOS
find . -name "*.log" -type f -mtime +7 -delete

# Windows PowerShell
Get-ChildItem *.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item

# Windows Command Prompt
forfiles /p . /m *.log /d -7 /c "cmd /c del @path"
```

### **📊 Universal Test Metrics and Reporting**

#### **Essential Test Metrics for Any Project**

1. **Test Success Rate**: `(Passed Tests / Total Tests) × 100`
2. **Test Execution Time**: Monitor for performance regression
3. **Code Coverage**: Aim for 80%+ on critical paths
4. **Test Stability**: Track flaky tests and intermittent failures
5. **Regression Detection**: Compare pre/post-change test results

#### **Standard Test Report Format**

```
=== Test Execution Summary ===
Date: {YYYY-MM-DD HH:MM:SS}
Total Tests: {passed + failed}
Passed: {count} ({percentage}%)
Failed: {count} ({percentage}%)
Execution Time: {seconds}s
Coverage: {percentage}%

=== Failed Tests ===
{list of failed test names with brief descriptions}

=== Recommendations ===
{prioritized action items}
```

### **🔧 Technology-Agnostic Testing Practices**

#### **1. Test Classification by Risk and Scope**

```
Unit Tests (Low Risk, High Coverage)
├── Pure Functions
├── Business Logic
└── Data Transformations

Integration Tests (Medium Risk, Moderate Coverage)
├── API Endpoints
├── Database Operations
└── External Service Interactions

End-to-End Tests (High Risk, Low Coverage)
├── Critical User Journeys
├── Business-Critical Workflows
└── Security Boundaries
```

#### **2. Universal Test Naming Convention**

```
{ComponentName}_{TestScenario}_{ExpectedOutcome}

Examples:
- UserService_ValidInput_ReturnsUser
- PaymentProcessor_InvalidCard_ThrowsException
- SearchAPI_EmptyQuery_ReturnsAllResults
```

#### **3. Test Data Management Strategy**

```
Test Data Hierarchy:
1. Fixtures: Static, reusable test data
2. Factories: Dynamic test data generation
3. Mocks: External dependency simulation
4. Stubs: Simplified implementations for testing
```

### **🚀 Continuous Testing Workflow**

#### **Daily Development Cycle**

1. **Pre-Commit**: Run affected tests locally
2. **Post-Commit**: Execute full test suite in CI
3. **Daily Report**: Review overnight test results
4. **Weekly Cleanup**: Remove obsolete tests and logs

#### **Test Failure Response Protocol**

1. **Immediate Triage**: Categorize as regression, flaky, or environment issue
2. **Root Cause Analysis**: Use logs to identify the actual cause
3. **Fix Priority**:
   - Critical: Business-blocking functionality
   - High: Major feature regression
   - Medium: Minor functionality impact
   - Low: Test infrastructure issues

### **📈 Test Strategy Evolution**

#### **Quarterly Test Strategy Review**

1. **Metrics Analysis**: Review success rates, execution times, coverage trends
2. **Tool Evaluation**: Assess testing framework effectiveness
3. **Process Improvement**: Identify bottlenecks in testing workflow
4. **Training Needs**: Address skill gaps in testing practices

#### **Technology Migration Testing**

When changing frameworks or platforms:

1. **Parallel Testing**: Run old and new test suites simultaneously
2. **Feature Parity**: Ensure new tests cover same functionality
3. **Performance Comparison**: Verify test execution efficiency
4. **Migration Validation**: Gradual cutover with rollback capability

This universal testing strategy ensures consistent quality practices across all development projects while adapting to specific technology requirements.

37. **Implement Comprehensive Test Coverage for State Management**

    - **Do**: All custom hooks and context providers must have corresponding test files covering:
      - State initialization
      - State update operations
      - API integration scenarios
      - Error handling paths
    - **Don't**: Deploy state management features without automated tests.

38. **Implement Hierarchical Error Boundaries for Production Stability**
    - **Do**: Establish a three-tier error boundary system to prevent application crashes:
      - **Page Level**: Wrap the entire application with `PageErrorBoundary` to catch application-wide errors
      - **Feature Level**: Wrap feature modules (contexts, providers) with `FeatureErrorBoundary` to isolate domain-specific errors
      - **Component Level**: Wrap critical UI components with `ComponentErrorBoundary` for granular error isolation
    - **Do**: Include retry functionality, user-friendly error messages, and development-specific error details in all error boundaries.
    - **Do**: Log error details with unique identifiers for production debugging and monitoring.
    - **Don't**: Leave critical UI components unprotected by error boundaries, especially those handling user input or external data.

### **VII. Execution Environment and Command Operation Conventions**

38. **Execute Commands Individually and Verify Each Step**

    - **Do**: When operating in a terminal or shell, execute each command one by one. For example, first execute the `cd` command to change directories, and _then_ execute the next command like `npm run build`. Do not chain commands that change the execution context (like `cd`) with subsequent operational commands using `&&` or `;`. This prevents errors where a command is executed in the wrong directory.
    - **Do**:
      1. `cd /path/to/project`
      2. `npm run build`

39. **Mandatory Verification Before Log File Access**
    - **Do**: Always display explicit confirmation before accessing log files or test results: `echo "ログファイルを確認"`
    - **Do**: Wait for command completion before proceeding to file verification
    - **Do**: Use systematic verification steps for all log-dependent operations:
      1. Execute the command
      2. Display verification message
      3. Check file existence
      4. Verify file content
    - **Don't**: Rush to read log files immediately after command execution without proper verification steps
