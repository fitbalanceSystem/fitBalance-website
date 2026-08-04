@admin @orders @sanity @regression
Feature: Admin - Order Management
  As an admin
  I want to manage shop orders
  So that I can fulfil customer purchases

  Background:
    Given I am logged in as admin
    And I am on the admin orders page

  @sanity
  Scenario: Orders KPIs are visible
    Then the orders KPI values are displayed

  @regression
  Scenario: Filter orders by status
    When I filter orders by status "pending"
    Then the orders count badge is visible

  @regression
  Scenario: Open order detail modal
    When I open the first order
    Then the order modal is visible
