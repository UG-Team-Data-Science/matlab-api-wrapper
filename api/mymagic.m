function y = mymagic(x)
  y = magic(x);
  if x == 1
    y = [[y]]
  end
end