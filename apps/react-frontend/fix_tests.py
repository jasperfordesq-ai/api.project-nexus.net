import os, re

base = 'C:/platforms/htdocs/staging/react-frontend'

files_to_fix = [
    'src/components/compose/shared/LinkPreview.test.tsx',
    'src/components/feed/FeedCard.test.tsx',
    'src/components/feedback/AppUpdateModal.test.tsx',
    'src/components/feedback/ErrorBoundary.test.tsx',
    'src/components/feedback/FeatureErrorBoundary.test.tsx',
    'src/components/feedback/LoadingScreen.test.tsx',
    'src/components/feedback/OfflineIndicator.test.tsx',
    'src/components/feedback/SessionExpiredModal.test.tsx',
    'src/components/layout/__tests__/MegaMenu.test.tsx',
    'src/components/layout/__tests__/QuickCreateMenu.test.tsx',
    'src/components/layout/__tests__/SearchOverlay.test.tsx',
    'src/components/layout/Footer.test.tsx',
    'src/components/layout/Layout.test.tsx',
    'src/components/layout/MobileDrawer.test.tsx',
    'src/components/layout/MobileTabBar.test.tsx',
    'src/components/layout/Navbar.test.tsx',
    'src/components/legal/CustomLegalDocument.test.tsx',
    'src/components/location/__tests__/LocationComponents.test.tsx',
]

for f in files_to_fix:
    path = os.path.join(base, f)
    if not os.path.exists(path):
        print(f'SKIP: {f}')
        continue

    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()

    original = content

    # Fix single-line destructure: return ({ children, initial, animate, ..., ...rest }: any) => {
    def fix_single_line(m):
        props_str = m.group(1)
        props = [p.strip() for p in props_str.split(',')]
        prefixed = ', '.join('_' + p for p in props)
        return 'return ({ children, ' + prefixed + ', ...rest }: Record<string, unknown>) => {'

    content = re.sub(
        r'return \(\{ children, ((?:(?:initial|animate|exit|transition|variants|whileHover|whileTap|whileInView|layout|viewport|layoutId)(?:, )?)+), \.\.\.rest \}: any\) => \{',
        fix_single_line,
        content
    )

    # Fix multi-line destructure
    def fix_multiline(m):
        lines = m.group(1).strip().split('\n')
        props = [line.strip().rstrip(',') for line in lines if line.strip().rstrip(',')]
        prefixed = ',\n        '.join('_' + p for p in props)
        return 'return ({\n        children,\n        ' + prefixed + ',\n        ...rest\n      }: Record<string, unknown>) => {'

    content = re.sub(
        r'return \(\{\s*\n\s+children,\s*\n((?:\s+\w+,\s*\n)+)\s+\.\.\.rest\s*\n\s*\}: any\) => \{',
        fix_multiline,
        content
    )

    # get: (_: any, tag: string)
    content = content.replace('get: (_: any, tag: string)', 'get: (_: unknown, tag: string)')

    # ({ children }: any) => children
    content = content.replace('({ children }: any) => children', '({ children }: { children: React.ReactNode }) => children')

    # ({ children }: any) => <>{children}</>
    content = content.replace('({ children }: any) => <>{children}</>', '({ children }: { children: React.ReactNode }) => <>{children}</>')

    # ({ children, ...props }: any)
    content = content.replace('({ children, ...props }: any)', '({ children, ...props }: Record<string, unknown>)')

    # forwardRef: ({ children, ...p }: any, ref: any)
    content = content.replace('({ children, ...p }: any, ref: any)', '({ children, ...p }: Record<string, unknown>, ref: React.Ref<unknown>)')

    # ...args: any[]
    content = re.sub(r'\.\.\.args: any\[\]', '...args: unknown[]', content)

    # NavLink mock
    content = content.replace('({ children, to, className }: any)', '({ children, to, className }: { children: React.ReactNode; to: string; className?: string | ((opts: { isActive: boolean }) => string) })')

    # ({ onMobileMenuOpen }: any) unused
    content = content.replace('({ onMobileMenuOpen }: any)', '({ onMobileMenuOpen: _onMobileMenuOpen }: Record<string, unknown>)')

    # ({ isOpen }: any)
    content = content.replace('({ isOpen }: any)', '({ isOpen }: { isOpen?: boolean })')

    # Record<string, any>
    content = content.replace('Record<string, any>', 'Record<string, unknown>')

    # (global as any)
    content = content.replace('(global as any)', '(global as Record<string, unknown>)')

    # (item: any)
    content = content.replace('(item: any)', '(item: Record<string, unknown>)')

    # MegaMenu StubIcon
    content = content.replace('React.forwardRef((props: any, ref: any)', 'React.forwardRef((props: Record<string, unknown>, ref: React.Ref<SVGSVGElement>)')
    content = content.replace('(StubIcon as any).displayName', '(StubIcon as { displayName: string }).displayName')

    # FeedCard unused destructured vars
    content = content.replace(
        'const { variants, initial, animate, exit, layout, ...rest } = props;',
        'const { variants: _variants, initial: _initial, animate: _animate, exit: _exit, layout: _layout, ...rest } = props;'
    )

    # unused waitFor import
    import_line = "import { render, screen, waitFor } from '@/test/test-utils';"
    if import_line in content:
        rest = content.replace(import_line, '', 1)
        if 'waitFor' not in rest:
            content = content.replace(import_line, "import { render, screen } from '@/test/test-utils';")

    # ({ children, ...rest }: any)
    content = content.replace('({ children, ...rest }: any)', '({ children, ...rest }: Record<string, unknown>)')

    # ({ children }: any) => <div>{children}</div>
    content = content.replace('({ children }: any) => <div>{children}</div>', '({ children }: { children: React.ReactNode }) => <div>{children}</div>')

    # ({ message }: any)
    content = content.replace('({ message }: any)', '({ message }: { message?: string })')

    if content != original:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'FIXED: {f}')
    else:
        print(f'NO CHANGE: {f}')
