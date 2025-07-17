# -*- coding: utf-8 -*-
"""
テスト実行用のユーティリティとヘルパー関数
"""
import asyncio
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


def run_tests(
    test_paths: Optional[List[str]] = None,
    markers: Optional[List[str]] = None,
    coverage: bool = True,
    verbose: bool = True,
    parallel: bool = False
) -> int:
    """
    テストを実行する
    
    Args:
        test_paths: テストファイルまたはディレクトリのパス
        markers: 実行するテストマーカー
        coverage: カバレッジレポートを生成するか
        verbose: 詳細出力するか
        parallel: 並列実行するか
    
    Returns:
        終了コード
    """
    cmd = ["python", "-m", "pytest"]
    
    if test_paths:
        cmd.extend(test_paths)
    else:
        cmd.append("app/tests")
    
    if verbose:
        cmd.append("-v")
    
    if coverage:
        cmd.extend([
            "--cov=app",
            "--cov-report=html:htmlcov",
            "--cov-report=term-missing",
            "--cov-exclude=app/tests/*"
        ])
    
    if markers:
        for marker in markers:
            cmd.extend(["-m", marker])
    
    if parallel:
        cmd.extend(["-n", "auto"])
    
    cmd.extend(["--tb=short", "--disable-warnings"])
    
    print(f"実行コマンド: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=Path(__file__).parent.parent.parent)
    return result.returncode


def run_unit_tests() -> int:
    """ユニットテストのみを実行"""
    return run_tests(markers=["unit"])


def run_integration_tests() -> int:
    """統合テストのみを実行"""
    return run_tests(markers=["integration"])


def run_api_tests() -> int:
    """APIテストのみを実行"""
    return run_tests(markers=["api"])


def run_specific_test_file(test_file: str) -> int:
    """特定のテストファイルを実行"""
    return run_tests(test_paths=[f"app/tests/{test_file}"])


def run_all_tests() -> int:
    """すべてのテストを実行"""
    return run_tests()


def run_tests_with_coverage_report() -> int:
    """カバレッジレポート付きでテストを実行"""
    return run_tests(coverage=True)


def run_fast_tests() -> int:
    """高速テストのみを実行（slowマーカーを除外）"""
    return run_tests(markers=["not slow"])


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SQLDojoテスト実行ツール")
    parser.add_argument("--unit", action="store_true", help="ユニットテストのみ実行")
    parser.add_argument("--integration", action="store_true", help="統合テストのみ実行")
    parser.add_argument("--api", action="store_true", help="APIテストのみ実行")
    parser.add_argument("--fast", action="store_true", help="高速テストのみ実行")
    parser.add_argument("--file", type=str, help="特定のテストファイルを実行")
    parser.add_argument("--no-coverage", action="store_true", help="カバレッジレポートを無効化")
    parser.add_argument("--parallel", action="store_true", help="並列実行")
    parser.add_argument("--markers", nargs="+", help="特定のマーカーでテストを実行")
    
    args = parser.parse_args()
    
    if args.unit:
        exit_code = run_unit_tests()
    elif args.integration:
        exit_code = run_integration_tests()
    elif args.api:
        exit_code = run_api_tests()
    elif args.fast:
        exit_code = run_fast_tests()
    elif args.file:
        exit_code = run_specific_test_file(args.file)
    else:
        exit_code = run_tests(
            markers=args.markers,
            coverage=not args.no_coverage,
            parallel=args.parallel
        )
    
    sys.exit(exit_code)
