import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@repo/ui/components/dropdown-menu';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

// Basic dropdown menu
export const Basic: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Open menu</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>More</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

// Dropdown menu with checkbox/radio
export const WithCheckboxRadio: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Multi-select menu</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked>Option A</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Option B</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="1">
          <DropdownMenuRadioItem value="1">Option 1</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="2">Option 2</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
