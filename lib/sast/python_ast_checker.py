"""
Python SAST (Static Application Security Testing) Engine
Uses the built-in `ast` module to parse and analyze Python code
for dangerous patterns that could compromise system security.

Usage:
    python python_ast_checker.py <code_string>
    
Output: JSON with {safe: bool, violations: [{message, line, node_type}]}
"""

import ast
import sys
import json

# ---- Blacklists ----

FORBIDDEN_MODULES = {
    "os", "subprocess", "sys", "socket", "shutil", "ctypes",
    "importlib", "signal", "multiprocessing", "threading",
    "http", "urllib", "requests", "pickle", "shelve",
    "tempfile", "glob", "pathlib", "webbrowser",
    "code", "codeop", "compileall", "py_compile",
}

FORBIDDEN_FUNCTIONS = {
    "eval", "exec", "compile", "open", "__import__",
    "getattr", "setattr", "delattr", "globals", "locals",
    "breakpoint", "exit", "quit", "input",
}

FORBIDDEN_ATTRIBUTES = {
    "__subclasses__", "__globals__", "__builtins__",
    "__code__", "__closure__", "__self__",
    "__class__", "__bases__", "__mro__",
}


class SecurityVisitor(ast.NodeVisitor):
    """AST visitor that detects forbidden patterns in Python code."""

    def __init__(self):
        self.violations = []

    def _add_violation(self, node, message, node_type=""):
        self.violations.append({
            "message": message,
            "line": getattr(node, "lineno", 0),
            "node_type": node_type or type(node).__name__,
        })

    # ---- Import checks ----

    def visit_Import(self, node):
        for alias in node.names:
            module_root = alias.name.split(".")[0]
            if module_root in FORBIDDEN_MODULES:
                self._add_violation(
                    node,
                    f"금지된 모듈 import: '{alias.name}' (시스템 접근 차단)",
                    "Import",
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            module_root = node.module.split(".")[0]
            if module_root in FORBIDDEN_MODULES:
                self._add_violation(
                    node,
                    f"금지된 모듈 from-import: '{node.module}' (시스템 접근 차단)",
                    "ImportFrom",
                )
        self.generic_visit(node)

    # ---- Function call checks ----

    def visit_Call(self, node):
        # Direct function calls: eval(), exec(), open(), etc.
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_FUNCTIONS:
                self._add_violation(
                    node,
                    f"금지된 함수 호출: '{node.func.id}()' (보안 위반)",
                    "Call",
                )

        # Method calls on attributes: os.system(), subprocess.run(), etc.
        elif isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr

            # Check for dangerous method names
            dangerous_methods = {
                "system", "popen", "exec", "eval", "run",
                "call", "check_output", "check_call",
                "getoutput", "getstatusoutput",
                "remove", "rmdir", "unlink", "rmtree",
                "makedirs", "mkdir",
            }
            if attr_name in dangerous_methods:
                # Get the object name if possible
                obj_name = ""
                if isinstance(node.func.value, ast.Name):
                    obj_name = node.func.value.id + "."
                self._add_violation(
                    node,
                    f"금지된 메서드 호출: '{obj_name}{attr_name}()' (시스템 명령 실행 차단)",
                    "MethodCall",
                )

        self.generic_visit(node)

    # ---- Attribute access checks ----

    def visit_Attribute(self, node):
        if node.attr in FORBIDDEN_ATTRIBUTES:
            self._add_violation(
                node,
                f"금지된 속성 접근: '{node.attr}' (내부 객체 접근 차단)",
                "Attribute",
            )
        self.generic_visit(node)

    # ---- Prevent dynamic code execution via string manipulation ----

    def visit_FunctionDef(self, node):
        # Check for functions named like builtins that could shadow them
        if node.name in FORBIDDEN_FUNCTIONS:
            self._add_violation(
                node,
                f"금지된 함수명 재정의: '{node.name}' (빌트인 함수 쉐도잉 차단)",
                "FunctionDef",
            )
        self.generic_visit(node)


def check_code(code_string):
    """
    Parse Python code and check for security violations.
    Returns a dict with 'safe' (bool) and 'violations' (list).
    """
    result = {"safe": True, "violations": []}

    # Step 1: Try to parse the AST
    try:
        tree = ast.parse(code_string)
    except SyntaxError as e:
        result["safe"] = False
        result["violations"].append({
            "message": f"구문 오류: {e.msg} (라인 {e.lineno})",
            "line": e.lineno or 0,
            "node_type": "SyntaxError",
        })
        return result

    # Step 2: Visit all nodes
    visitor = SecurityVisitor()
    visitor.visit(tree)

    if visitor.violations:
        result["safe"] = False
        result["violations"] = visitor.violations

    return result


if __name__ == "__main__":
    if len(sys.argv) > 1:
        code = sys.argv[1]
    else:
        code = sys.stdin.read()

    result = check_code(code)
    print(json.dumps(result, ensure_ascii=False))
