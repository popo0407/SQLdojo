## **System Design & Development Charter for AI Development Agents**

This charter establishes the fundamental principles for continuously developing maintainable and scalable applications, minimizing future technical debt. AI agents must strictly adhere to the following rules in all coding, feature additions, and refactoring.

### **Top-Level Principles**

- The AI's internal thought process for analysis and strategy must be in English. However, explanations of the implementation plan, along with all other external responses and documentation, must be provided in Japanese.
- Review this entire development charter and process all tasks according to it.
- If any points are unclear, always seek clarification _before_ starting work.
- Upon agent startup, read the entirety of `Rule_or_coding.md` and display all top-level principles in the chat.
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

---

### **V. Refactoring Conventions: For Safe Code Evolution**

22. **The Absolute Protection of Production Features is the Top Priority**

    - **Do**: Conduct refactoring while ensuring that existing production functionality remains completely intact. Mocks and temporary implementations must be strictly isolated within test code and must not alter the behavior of production code.

23. **Guarantee Behavior with Tests**

    - **Do**: Before refactoring, create or verify tests that cover the target behavior. After refactoring, confirm that all of these tests pass.

24. **Thoroughly Identify and Manage the Scope of Impact**

    - **Do**: Before starting a change, identify every location where the target class, function, or variable is referenced (including in test code) and modify them consistently.

25. **Make Changes Small and Incremental**

    - **Do**: Break down large refactorings into smaller, meaningful units. Use separate commits or pull requests for each step. Verify and review at each stage.

26. **Plan for Gradual Migration with Backward Compatibility**

    - **Do**: When replacing an existing feature (API, class, etc.), first add the new feature and allow both to operate in parallel. Deprecate the old feature only after confirming that all callers have migrated to the new one.

27. **Maintain Environment Compatibility When Changing Settings**

    - **Do**: When changing configuration classes or environment variables, ensure the system can still start without errors using existing `.env` files. Use aliases or default values to maintain compatibility. Do not forget to update `env.example`.

28. **Clearly Document the Intent and Result of Changes**

    - **Do**: Clearly describe _why_ the refactoring was necessary and _what_ changes were made in commit messages, pull requests, and related documentation. Avoid vague messages like "Fixed."

29. **Roll Back Immediately if Anomalies Occur**

    - **Do**: If an unexpected error occurs or a test fails during refactoring, immediately stop the work and revert the changes (roll back). Investigate the cause calmly afterward.

30. **Avoid Temporary Fixes; Prioritize Fundamental Solutions Through Abstraction**

    - **Do**: When faced with failures or limitations of external services (databases, APIs, etc.), do not implement temporary workarounds with dummy data or stubs. Instead, confirm the desired handling with the user. Do not adopt temporary solutions that create technical debt.

31. **Design Principles for Abstraction Layers**
    - **Do**:
      - **Interface Segregation**: Always abstract external dependencies (DB, APIs, etc.) with interfaces, making concrete implementations injectable.
      - **Configuration-Driven**: Control behavior with environment variables or config files to allow switching without code changes.
      - **Gradual Migration**: Allow new implementations to run in parallel with existing ones for a phased transition.
      - **Fault Isolation**: Establish proper boundaries so that a failure in one external dependency does not affect other features.

### **VI. React-Specific Development Conventions**

32. **Enforce Single Source of Truth for State Management**

    - **Do**: Never create duplicate state management logic for the same data. If multiple files manage the same state (e.g., template preferences), consolidate them into a single Provider or Context.
    - **Don't**: Implement the same API call or state update logic in multiple files like `TemplateProvider.tsx` and `TemplateContext.tsx`.

33. **Ensure Type Safety in State Updates**

    - **Do**: When mapping data for API calls, ensure all required fields are properly typed and mapped. Use direct property access instead of dynamic field checking.
    - **Example**: Use `template.type` directly instead of `'type' in template ? template.type : 'user'`.

34. **Handle Async State Updates Correctly**

    - **Do**: When updating state that immediately needs to be sent to an API, either:
      - Pass the new data directly to the API call function
      - Wait for state update completion before API call
      - Use callback-based state updates
    - **Don't**: Call API functions immediately after state updates without ensuring the state has been updated.

35. **Maintain Component Pattern Consistency**

    - **Do**: When implementing similar UI patterns (like popovers, modals, tooltips), use the same implementation approach across all components.
    - **Do**: Create reusable hook patterns for common UI behaviors and reference existing implementations before creating new ones.

36. **Implement Comprehensive Test Coverage for State Management**

    - **Do**: All custom hooks and context providers must have corresponding test files covering:
      - State initialization
      - State update operations
      - API integration scenarios
      - Error handling paths
    - **Don't**: Deploy state management features without automated tests.

37. **Implement Hierarchical Error Boundaries for Production Stability**
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
