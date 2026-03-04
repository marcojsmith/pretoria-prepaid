import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Progress } from "./progress";
import { Separator } from "./separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";

describe("UI Components", () => {
  it("renders Button", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("renders Card", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders Input", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders Label", () => {
    render(<Label htmlFor="test">Label</Label>);
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("renders Progress", () => {
    const { container } = render(<Progress value={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders Separator", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders Tabs", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Content 1")).toBeInTheDocument();
  });

  it("renders Tooltip", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("Hover")).toBeInTheDocument();
  });
});
